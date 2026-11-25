package com.smartazerigas.ccc.ui

import android.annotation.SuppressLint
import android.content.Context
import android.util.AttributeSet
import android.view.GestureDetector
import android.view.MotionEvent
import android.view.ScaleGestureDetector
import android.view.animation.DecelerateInterpolator
import android.widget.FrameLayout
import kotlin.math.min

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
     * Fired once when overview zoom reaches ~one page.
     * page is 1-based wall id.
     */
    var onEnterSinglePage: ((page: Int) -> Unit)? = null

    var onTransformChanged: ((scale: Float, transX: Float, transY: Float) -> Unit)? = null

    var gridCols: Int = 7
    var gridRows: Int = 3

    /** Overview scale at which one column roughly fills the width (cols / 1.05). */
    private val enterPageScale: Float
        get() = gridCols / 1.08f

    private var scale = 1f
    private val minScale = 1f
    private val maxScale = 10f
    private var transX = 0f
    private var transY = 0f

    private var pinchOutProgress = 1f
    private var enteredPage = false
    private var pinchOutFired = false

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
                    val factor = detector.scaleFactor
                    // Ease extreme jumps for smoother feel
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
                if (!zoomEnabled || scaleDetector.isInProgress) return false
                if (scale <= minScale + 0.01f) return false
                transX -= distanceX
                transY -= distanceY
                clampTranslation()
                applyToChild()
                notifyTransform()
                return true
            }

            override fun onDoubleTap(e: MotionEvent): Boolean {
                if (!zoomEnabled) return false
                if (scale > minScale + 0.05f) {
                    animateTo(1f, 0f, 0f)
                } else {
                    val target = min(maxScale, enterPageScale * 0.72f)
                    val nx = measuredWidth / 2f - e.x * target
                    val ny = measuredHeight / 2f - e.y * target
                    animateTo(target, nx, ny)
                }
                return true
            }
        },
    )

    val currentScale: Float get() = scale

    fun resetTransform(animate: Boolean) {
        enteredPage = false
        if (animate) animateTo(1f, 0f, 0f)
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
        val cols = gridCols
        val rows = gridRows
        val index = (page - 1).coerceIn(0, cols * rows - 1)
        val col = index % cols
        val row = index / cols
        val targetScale = (cols / 1.35f).coerceIn(2.5f, maxScale)
        val pageCx = (col + 0.5f) / cols * measuredWidth
        val pageCy = (row + 0.5f) / rows * measuredHeight
        // Keep stage vertically centered content in view: approximate mid.
        val nx = measuredWidth / 2f - pageCx * targetScale
        val ny = measuredHeight / 2f - pageCy * targetScale
        enteredPage = false
        if (animate) animateTo(targetScale, nx, ny)
        else {
            scale = targetScale
            transX = nx
            transY = ny
            clampTranslation()
            applyToChild()
            notifyTransform()
        }
    }

    fun pageAtCenter(): Int {
        val cols = gridCols
        val rows = gridRows
        if (scale < 1.01f) return 1
        val cx = (measuredWidth / 2f - transX) / scale
        val cy = (measuredHeight / 2f - transY) / scale
        val col = ((cx / measuredWidth) * cols).toInt().coerceIn(0, cols - 1)
        val row = ((cy / measuredHeight) * rows).toInt().coerceIn(0, rows - 1)
        return row * cols + col + 1
    }

    private fun maybeEnterSinglePage() {
        if (enteredPage || !zoomEnabled) return
        if (scale < enterPageScale) return
        enteredPage = true
        onEnterSinglePage?.invoke(pageAtCenter())
    }

    private fun animateTo(targetScale: Float, targetX: Float, targetY: Float) {
        val startS = scale
        val startX = transX
        val startY = transY
        val anim = android.animation.ValueAnimator.ofFloat(0f, 1f)
        anim.duration = 220
        anim.interpolator = DecelerateInterpolator()
        anim.addUpdateListener {
            val t = it.animatedValue as Float
            scale = startS + (targetScale - startS) * t
            transX = startX + (targetX - startX) * t
            transY = startY + (targetY - startY) * t
            clampTranslation()
            applyToChild()
            notifyTransform()
        }
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
        scaleDetector.onTouchEvent(event)
        if (zoomEnabled) panDetector.onTouchEvent(event)
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
