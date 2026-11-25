package com.smartazerigas.ccc.ui

import android.annotation.SuppressLint
import android.content.Context
import android.util.AttributeSet
import android.view.GestureDetector
import android.view.MotionEvent
import android.view.ScaleGestureDetector
import android.widget.FrameLayout
import kotlin.math.max
import kotlin.math.min

/**
 * Pinch-zoom + pan host for View All.
 * At scale=1 the wall fits the full width (empty bars top/bottom when aspect is wider than the screen).
 * Pinch in to inspect a region; pinch/double-tap out to see all screens again.
 */
class ZoomPanLayout @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
) : FrameLayout(context, attrs) {

    var zoomEnabled: Boolean = false
        set(value) {
            field = value
            if (!value) resetTransform(requestLayout = true)
            else requestLayout()
        }

    /** Width / height of the wall canvas (e.g. 13440/3240). */
    var contentAspect: Float = 16f / 9f
        set(value) {
            if (field == value) return
            field = value
            if (zoomEnabled) resetTransform(requestLayout = true)
        }

    private var scale = 1f
    private val minScale = 1f
    private val maxScale = 8f
    private var transX = 0f
    private var transY = 0f

    private val scaleDetector = ScaleGestureDetector(
        context,
        object : ScaleGestureDetector.SimpleOnScaleGestureListener() {
            override fun onScale(detector: ScaleGestureDetector): Boolean {
                if (!zoomEnabled) return false
                val newScale = (scale * detector.scaleFactor).coerceIn(minScale, maxScale)
                val focusX = detector.focusX
                val focusY = detector.focusY
                transX = focusX - (focusX - transX) * (newScale / scale)
                transY = focusY - (focusY - transY) * (newScale / scale)
                scale = newScale
                clampTranslation()
                applyToChild()
                return true
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
                return true
            }

            override fun onDoubleTap(e: MotionEvent): Boolean {
                if (!zoomEnabled) return false
                if (scale > minScale + 0.05f) {
                    resetTransform(requestLayout = false)
                } else {
                    val target = min(maxScale, minScale * 2.5f)
                    val child = getChildAt(0) ?: return true
                    val baseX = (measuredWidth - child.measuredWidth) / 2f
                    val baseY = (measuredHeight - child.measuredHeight) / 2f
                    // Zoom toward tap point.
                    val localX = e.x - baseX
                    val localY = e.y - baseY
                    scale = target
                    transX = e.x - localX * scale - baseX
                    transY = e.y - localY * scale - baseY
                    clampTranslation()
                    applyToChild()
                }
                return true
            }
        },
    )

    fun resetTransform(requestLayout: Boolean) {
        scale = 1f
        transX = 0f
        transY = 0f
        applyToChild()
        if (requestLayout) requestLayout()
    }

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        val width = MeasureSpec.getSize(widthMeasureSpec)
        val height = MeasureSpec.getSize(heightMeasureSpec)
        setMeasuredDimension(width, height)

        val child = getChildAt(0) ?: return
        if (!zoomEnabled || width == 0 || height == 0) {
            child.measure(
                MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
                MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY),
            )
            return
        }

        val boxW = width.toFloat()
        val boxH = boxW / contentAspect
        child.measure(
            MeasureSpec.makeMeasureSpec(max(1, boxW.toInt()), MeasureSpec.EXACTLY),
            MeasureSpec.makeMeasureSpec(max(1, boxH.toInt()), MeasureSpec.EXACTLY),
        )
    }

    override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
        val child = getChildAt(0) ?: return
        val childW = child.measuredWidth
        val childH = child.measuredHeight
        val x = (measuredWidth - childW) / 2
        val y = (measuredHeight - childH) / 2
        child.layout(x, y, x + childW, y + childH)
        if (zoomEnabled) {
            clampTranslation()
            applyToChild()
        } else {
            child.pivotX = 0f
            child.pivotY = 0f
            child.scaleX = 1f
            child.scaleY = 1f
            child.translationX = 0f
            child.translationY = 0f
        }
    }

    override fun onInterceptTouchEvent(ev: MotionEvent): Boolean {
        if (!zoomEnabled) return false
        scaleDetector.onTouchEvent(ev)
        // Always intercept in overview so pinch/pan never fight the WebView.
        return true
    }

    @SuppressLint("ClickableViewAccessibility")
    override fun onTouchEvent(event: MotionEvent): Boolean {
        if (!zoomEnabled) return super.onTouchEvent(event)
        scaleDetector.onTouchEvent(event)
        panDetector.onTouchEvent(event)
        return true
    }

    private fun applyToChild() {
        val child = getChildAt(0) ?: return
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
        val baseX = (measuredWidth - child.measuredWidth) / 2f
        val baseY = (measuredHeight - child.measuredHeight) / 2f

        if (scaledW <= measuredWidth) {
            transX = (measuredWidth - scaledW) / 2f - baseX
        } else {
            val absX = (baseX + transX).coerceIn(measuredWidth - scaledW, 0f)
            transX = absX - baseX
        }

        if (scaledH <= measuredHeight) {
            transY = (measuredHeight - scaledH) / 2f - baseY
        } else {
            val absY = (baseY + transY).coerceIn(measuredHeight - scaledH, 0f)
            transY = absY - baseY
        }
    }
}
