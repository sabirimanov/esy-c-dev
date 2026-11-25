package com.smartazerigas.ccc.ui

import android.content.Context
import android.util.AttributeSet
import android.widget.FrameLayout
import kotlin.math.min

/**
 * 16:9 content aligned to the **top** of the view; leftover black space sits below
 * (room for tablet chrome). Optional [bottomReservePx] shrinks the available height further.
 */
class LetterboxLayout @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
) : FrameLayout(context, attrs) {

    var enabledLetterbox: Boolean = true
        set(value) {
            if (field == value) return
            field = value
            requestLayout()
        }

    var bottomReservePx: Int = 0
        set(value) {
            val v = value.coerceAtLeast(0)
            if (field == v) return
            field = v
            requestLayout()
        }

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        val width = MeasureSpec.getSize(widthMeasureSpec)
        val height = MeasureSpec.getSize(heightMeasureSpec)
        setMeasuredDimension(width, height)

        val child = getChildAt(0) ?: return
        if (!enabledLetterbox || width == 0 || height == 0) {
            child.measure(
                MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
                MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY),
            )
            return
        }

        val availH = (height - bottomReservePx).coerceAtLeast(1)
        val targetRatio = 16f / 9f
        val viewRatio = width.toFloat() / availH.toFloat()
        val childW: Int
        val childH: Int
        if (viewRatio > targetRatio) {
            childH = availH
            childW = (availH * targetRatio).toInt()
        } else {
            childW = width
            childH = (width / targetRatio).toInt()
        }
        child.measure(
            MeasureSpec.makeMeasureSpec(min(childW, width), MeasureSpec.EXACTLY),
            MeasureSpec.makeMeasureSpec(min(childH, availH), MeasureSpec.EXACTLY),
        )
    }

    override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
        val child = getChildAt(0) ?: return
        val childW = child.measuredWidth
        val childH = child.measuredHeight
        val x = (measuredWidth - childW) / 2
        // Pin to top — empty space (and UI chrome) stay below.
        val y = 0
        child.layout(x, y, x + childW, y + childH)
    }
}
