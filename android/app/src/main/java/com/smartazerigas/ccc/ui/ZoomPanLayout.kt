package com.smartazerigas.ccc.ui

import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.animation.ValueAnimator
import android.annotation.SuppressLint
import android.content.Context
import android.util.AttributeSet
import android.view.GestureDetector
import android.view.MotionEvent
import android.view.ScaleGestureDetector
import android.view.animation.DecelerateInterpolator
import android.widget.FrameLayout

/**
 * Smooth pinch-zoom + pan for View All, plus pinch-out detection on single pages.
 */
class ZoomPanLayout @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
) : FrameLayout(context, attrs) {

    var zoomEnabled: Boolean = false
        set(value) {
            field = value
            if (!value) resetTransform(animate = false)
        }

    /** When not in overview: listen for two-finger pinch-out → enter View All. */
    var pinchOutEnabled: Boolean = false
    var onPinchOut: (() -> Unit)? = null

    /**
     * Fired once when overview zoom reaches ~one page (pinch or double-tap).
     * page is 1-based wall id.
     */
    var onEnterSinglePage: ((page: Int) -> Unit)? = null

    var onTransformChanged: ((scale: Float, transX: Float, transY: Float) -> Unit)? = null

    var gridCols: Int = 7
    var gridRows: Int = 3

    /** Overview scale at which one column roughly fills the width. */
    private val enterPageScale: Float
        get() = gridCols / 1.05f

    private var scale = 1f
    private val minScale = 1f
    private val maxScale = 10f
    private var transX = 0f
    private var transY = 0f

    private var pinchOutProgress = 1f
    private var enteredPage = false
    private var pinchOutFired = false
    private var zoomAnimator: ValueAnimator? = null

    // Manual double-tap (GestureDetector is unreliable while ScaleGestureDetector also runs).
    private var lastTapTime = 0L
    private var lastTapX = 0f
    private var lastTapY = 0f

    private val scaleDetector = ScaleGestureDetector(
        context,
        object : ScaleGestureDetector.SimpleOnScaleGestureListener() {
            override fun onScaleBegin(detector: ScaleGestureDetector): Boolean {
                pinchOutProgress = 1f
                pinchOutFired = false
                return true
            }

            override fun onScale(detector: ScaleGestureDetector): Boolean {
                if (zoomEnabled) {
                    if (enteredPage) return true
                    val factor = detector.scaleFactor
                    val eased = 1f + (factor - 1f) * 0.92f
                    val newScale = (scale * eased).coerceIn(minScale, maxScale)
                    val focusX = detector.focusX
                    val focusY = detector.focusY
                    transX = focusX - (focusX - transX) * (newScale / scale)
                    transY = focusY - (focusY - transY) * (newScale / scale)
                    scale = newScale
                    clampTranslation()
                    applyToChild()
                    notifyTransform()
                    maybeEnterSinglePage()
                    return true
                }
                if (pinchOutEnabled) {
                    pinchOutProgress *= detector.scaleFactor
                    if (!pinchOutFired && pinchOutProgress < 0.82f) {
                        pinchOutFired = true
                        onPinchOut?.invoke()
                    }
                    return true
                }
                return false
            }
        },
    )

    private val panDetector = GestureDetector(
        context,
        object : GestureDetector.SimpleOnGestureListener() {
            override fun onDown(e: MotionEvent): Boolean = zoomEnabled

            override fun onScroll(
                e1: MotionEvent?,
                e2: MotionEvent,
                distanceX: Float,
                distanceY: Float,
            ): Boolean {
                if (!zoomEnabled || enteredPage || scaleDetector.isInProgress) return false
                if (scale <= minScale + 0.01f) return false
                transX -= distanceX
                transY -= distanceY
                clampTranslation()
                applyToChild()
                notifyTransform()
                return true
            }

            override fun onDoubleTap(e: MotionEvent): Boolean {
                handleDoubleTap(e.x, e.y)
                return true
            }

            override fun onSingleTapConfirmed(e: MotionEvent): Boolean = false
        },
    )

    val currentScale: Float get() = scale

    fun resetTransform(animate: Boolean) {
        enteredPage = false
        zoomAnimator?.cancel()
        if (animate) animateTo(1f, 0f, 0f, durationMs = 280)
        else {
            scale = 1f
            transX = 0f
            transY = 0f
            applyToChild()
            notifyTransform()
        }
    }

    /** Focus a wall page (1-based) at a scale slightly wider than one page. */
    fun focusPage(page: Int, animate: Boolean = true) {
        enteredPage = false
        val target = transformForPage(page, fillScale = enterPageScale / 1.28f)
        if (animate) animateTo(target.scale, target.x, target.y, durationMs = 360)
        else {
            scale = target.scale
            transX = target.x
            transY = target.y
            clampTranslation()
            applyToChild()
            notifyTransform()
        }
    }

    /** Smooth zoom into a page until it fills the viewport, then open single-page mode. */
    fun zoomIntoPage(page: Int, enterSingle: Boolean) {
        if (!zoomEnabled || enteredPage) return
        val safePage = page.coerceIn(1, gridCols * gridRows)
        val target = transformForPage(safePage, fillScale = enterPageScale)
        if (enterSingle) enteredPage = true
        animateTo(target.scale, target.x, target.y, durationMs = 520) {
            if (enterSingle) onEnterSinglePage?.invoke(safePage)
        }
    }

    private fun handleDoubleTap(x: Float, y: Float) {
        if (!zoomEnabled || enteredPage) return
        zoomIntoPage(pageAtPoint(x, y), enterSingle = true)
    }

    fun pageAtCenter(): Int = pageAtPoint(measuredWidth / 2f, measuredHeight / 2f)

    fun pageAtPoint(viewX: Float, viewY: Float): Int {
        val cols = gridCols
        val rows = gridRows
        val stage = stageRect()
        val cx = (viewX - transX) / scale
        val cy = (viewY - transY) / scale
        val lx = ((cx - stage.left) / stage.width).coerceIn(0f, 0.999f)
        val ly = ((cy - stage.top) / stage.height).coerceIn(0f, 0.999f)
        val col = (lx * cols).toInt().coerceIn(0, cols - 1)
        val row = (ly * rows).toInt().coerceIn(0, rows - 1)
        return row * cols + col + 1
    }

    private data class Transform(val scale: Float, val x: Float, val y: Float)
    private data class RectF(val left: Float, val top: Float, val width: Float, val height: Float)

    /** Overview stage is fit-width and vertically centered inside the WebView. */
    private fun stageRect(): RectF {
        val stageW = measuredWidth.toFloat().coerceAtLeast(1f)
        val stageH = stageW * (gridRows * 9f) / (gridCols * 16f)
        val stageTop = (measuredHeight - stageH) / 2f
        return RectF(0f, stageTop, stageW, stageH)
    }

    private fun transformForPage(page: Int, fillScale: Float): Transform {
        val cols = gridCols
        val rows = gridRows
        val index = (page - 1).coerceIn(0, cols * rows - 1)
        val col = index % cols
        val row = index / cols
        val stage = stageRect()
        val pageCx = stage.left + (col + 0.5f) / cols * stage.width
        val pageCy = stage.top + (row + 0.5f) / rows * stage.height
        val targetScale = fillScale.coerceIn(2.2f, maxScale)
        val nx = measuredWidth / 2f - pageCx * targetScale
        val ny = measuredHeight / 2f - pageCy * targetScale
        return Transform(targetScale, nx, ny)
    }

    private fun maybeEnterSinglePage() {
        if (enteredPage || !zoomEnabled) return
        if (scale < enterPageScale) return
        enteredPage = true
        onEnterSinglePage?.invoke(pageAtCenter())
    }

    private fun animateTo(
        targetScale: Float,
        targetX: Float,
        targetY: Float,
        durationMs: Long = 320,
        onEnd: (() -> Unit)? = null,
    ) {
        zoomAnimator?.cancel()
        val startS = scale
        val startX = transX
        val startY = transY
        // Clamp end translation for the target scale.
        val end = run {
            scale = targetScale
            transX = targetX
            transY = targetY
            clampTranslation()
            val ex = transX
            val ey = transY
            scale = startS
            transX = startX
            transY = startY
            Transform(targetScale, ex, ey)
        }
        val anim = ValueAnimator.ofFloat(0f, 1f)
        zoomAnimator = anim
        anim.duration = durationMs
        anim.interpolator = DecelerateInterpolator(1.6f)
        anim.addUpdateListener {
            val t = it.animatedFraction
            // Smoothstep for a softer settle.
            val e = t * t * (3f - 2f * t)
            scale = startS + (end.scale - startS) * e
            transX = startX + (end.x - startX) * e
            transY = startY + (end.y - startY) * e
            applyToChild()
            notifyTransform()
        }
        anim.addListener(object : AnimatorListenerAdapter() {
            override fun onAnimationEnd(animation: Animator) {
                scale = end.scale
                transX = end.x
                transY = end.y
                applyToChild()
                notifyTransform()
                onEnd?.invoke()
            }
        })
        anim.start()
    }

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        val width = MeasureSpec.getSize(widthMeasureSpec)
        val height = MeasureSpec.getSize(heightMeasureSpec)
        setMeasuredDimension(width, height)
        val child = getChildAt(0) ?: return
        child.measure(
            MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
            MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY),
        )
    }

    override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
        val child = getChildAt(0) ?: return
        child.layout(0, 0, measuredWidth, measuredHeight)
        if (!zoomEnabled) {
            child.pivotX = 0f
            child.pivotY = 0f
            child.scaleX = 1f
            child.scaleY = 1f
            child.translationX = 0f
            child.translationY = 0f
        } else {
            clampTranslation()
            applyToChild()
        }
    }

    override fun onInterceptTouchEvent(ev: MotionEvent): Boolean {
        if (!zoomEnabled && !pinchOutEnabled) return false
        scaleDetector.onTouchEvent(ev)
        // Intercept when zooming/panning overview, or when a pinch starts in single mode.
        if (zoomEnabled) return true
        return ev.pointerCount >= 2
    }

    @SuppressLint("ClickableViewAccessibility")
    override fun onTouchEvent(event: MotionEvent): Boolean {
        if (!zoomEnabled && !pinchOutEnabled) return super.onTouchEvent(event)
        if (event.pointerCount >= 2) {
            scaleDetector.onTouchEvent(event)
            lastTapTime = 0L
            return true
        }
        scaleDetector.onTouchEvent(event)
        if (zoomEnabled) {
            panDetector.onTouchEvent(event)
            // Backup double-tap detection — works even when GestureDetector misses.
            when (event.actionMasked) {
                MotionEvent.ACTION_UP -> {
                    val now = event.eventTime
                    val dx = event.x - lastTapX
                    val dy = event.y - lastTapY
                    val dist = kotlin.math.sqrt(dx * dx + dy * dy)
                    if (lastTapTime > 0 && now - lastTapTime <= 320 && dist < 96f * resources.displayMetrics.density) {
                        handleDoubleTap(event.x, event.y)
                        lastTapTime = 0L
                    } else {
                        lastTapTime = now
                        lastTapX = event.x
                        lastTapY = event.y
                    }
                }
            }
        }
        return true
    }

    private fun applyToChild() {
        val child = getChildAt(0) ?: return
        child.setLayerType(LAYER_TYPE_HARDWARE, null)
        child.pivotX = 0f
        child.pivotY = 0f
        child.scaleX = scale
        child.scaleY = scale
        child.translationX = transX
        child.translationY = transY
    }

    private fun clampTranslation() {
        val child = getChildAt(0) ?: return
        val scaledW = child.measuredWidth * scale
        val scaledH = child.measuredHeight * scale
        if (scaledW <= measuredWidth) {
            transX = (measuredWidth - scaledW) / 2f
        } else {
            transX = transX.coerceIn(measuredWidth - scaledW, 0f)
        }
        if (scaledH <= measuredHeight) {
            // Vertically center when content shorter than host.
            transY = (measuredHeight - scaledH) / 2f
        } else {
            transY = transY.coerceIn(measuredHeight - scaledH, 0f)
        }
    }

    private fun notifyTransform() {
        onTransformChanged?.invoke(scale, transX, transY)
    }
}
