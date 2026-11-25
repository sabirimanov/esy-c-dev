package com.smartazerigas.ccc.ui

import android.annotation.SuppressLint
import android.content.Context
import android.util.AttributeSet
import android.view.GestureDetector
import android.view.MotionEvent
import android.view.ScaleGestureDetector
import android.widget.FrameLayout
import kotlin.math.min

/**
 * Native pinch-zoom + pan for View All.
 * At scale=1 the child fills the host (page already CSS-fits all screens).
 * Pinch in to inspect a region; double-tap toggles zoom / reset.
 */
class ZoomPanLayout @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
) : FrameLayout(context, attrs) {

    var zoomEnabled: Boolean = false
        set(value) {
            field = value
            if (!value) resetTransform(requestLayout = false)
        }

    var onTransformChanged: ((scale: Float, transX: Float, transY: Float) -> Unit)? = null

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
                notifyTransform()
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
                notifyTransform()
                return true
            }

            override fun onDoubleTap(e: MotionEvent): Boolean {
                if (!zoomEnabled) return false
                if (scale > minScale + 0.05f) {
                    resetTransform(requestLayout = false)
                } else {
                    val target = min(maxScale, 3f)
                    scale = target
                    transX = measuredWidth / 2f - e.x * scale
                    transY = measuredHeight / 2f - e.y * scale
                    clampTranslation()
                    applyToChild()
                    notifyTransform()
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
        notifyTransform()
        if (requestLayout) requestLayout()
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
        if (!zoomEnabled) return false
        scaleDetector.onTouchEvent(ev)
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
        if (scaledW <= measuredWidth) {
            transX = (measuredWidth - scaledW) / 2f
        } else {
            transX = transX.coerceIn(measuredWidth - scaledW, 0f)
        }
        if (scaledH <= measuredHeight) {
            // Keep content top-aligned when smaller than host (matches letterbox-top UX).
            transY = 0f
        } else {
            transY = transY.coerceIn(measuredHeight - scaledH, 0f)
        }
    }

    private fun notifyTransform() {
        onTransformChanged?.invoke(scale, transX, transY)
    }
}
