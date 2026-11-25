package com.smartazerigas.ccc.ui

import android.content.Context
import android.util.AttributeSet
import android.view.GestureDetector
import android.view.MotionEvent
import android.widget.FrameLayout
import kotlin.math.abs

/**
 * Detects horizontal page swipes without blocking taps / vertical scrolls inside the WebView.
 * Swipe right (finger moves right) → next; swipe left → previous. Matches the wall remote UX.
 */
class SwipeFrameLayout @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
) : FrameLayout(context, attrs) {

    var swipeEnabled: Boolean = true
    var onSwipeNext: (() -> Unit)? = null
    var onSwipePrev: (() -> Unit)? = null

    private val minDistancePx = 96f * resources.displayMetrics.density
    private val minVelocity = 600f

    private val detector = GestureDetector(context, object : GestureDetector.SimpleOnGestureListener() {
        override fun onDown(e: MotionEvent): Boolean = true

        override fun onFling(
            e1: MotionEvent?,
            e2: MotionEvent,
            velocityX: Float,
            velocityY: Float,
        ): Boolean {
            if (!swipeEnabled || e1 == null) return false
            val dx = e2.x - e1.x
            val dy = e2.y - e1.y
            if (abs(dx) < minDistancePx) return false
            if (abs(dx) < abs(dy) * 1.2f) return false
            if (abs(velocityX) < minVelocity) return false
            if (dx > 0) onSwipeNext?.invoke() else onSwipePrev?.invoke()
            return true
        }
    })

    override fun dispatchTouchEvent(ev: MotionEvent): Boolean {
        if (swipeEnabled) detector.onTouchEvent(ev)
        return super.dispatchTouchEvent(ev)
    }
}
