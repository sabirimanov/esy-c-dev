package com.smartazerigas.ccc.ui

import android.content.Context
import android.util.AttributeSet
import android.widget.FrameLayout
import kotlin.math.min

/**
 * Forces the single child into a centered 16:9 box; leftover area stays the parent background (black).
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

        val targetRatio = 16f / 9f
        val viewRatio = width.toFloat() / height.toFloat()
        val childW: Int
        val childH: Int
        if (viewRatio > targetRatio) {
            childH = height
            childW = (height * targetRatio).toInt()
        } else {
            childW = width
            childH = (width / targetRatio).toInt()
        }
        child.measure(
            MeasureSpec.makeMeasureSpec(min(childW, width), MeasureSpec.EXACTLY),
            MeasureSpec.makeMeasureSpec(min(childH, height), MeasureSpec.EXACTLY),
        )
    }

    override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
        val child = getChildAt(0) ?: return
        val childW = child.measuredWidth
        val childH = child.measuredHeight
        val x = (measuredWidth - childW) / 2
        val y = (measuredHeight - childH) / 2
        child.layout(x, y, x + childW, y + childH)
    }
}
