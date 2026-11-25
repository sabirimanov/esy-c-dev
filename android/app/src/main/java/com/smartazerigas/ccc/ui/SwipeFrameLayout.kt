package com.smartazerigas.ccc.ui

import android.annotation.SuppressLint
import android.content.Context
import android.util.AttributeSet
import android.view.MotionEvent
import android.view.ViewConfiguration
import android.widget.FrameLayout
import kotlin.math.abs

/**
 * Interactive horizontal page-drag: content follows the finger, then settles.
 * Finger left → next; finger right → previous.
 */
class SwipeFrameLayout @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
) : FrameLayout(context, attrs) {

    var swipeEnabled: Boolean = true

    var onDragStart: (() -> Unit)? = null
    var onDrag: ((dx: Float) -> Unit)? = null
    /** dx = total finger travel (positive = finger right). velocityX in px/s. */
    var onDragEnd: ((dx: Float, velocityX: Float) -> Unit)? = null

    private val touchSlop = ViewConfiguration.get(context).scaledTouchSlop
    private var downX = 0f
    private var downY = 0f
    private var lastX = 0f
    private var lastT = 0L
    private var velocityX = 0f
    private var dragging = false
    private var tracking = false

    @SuppressLint("ClickableViewAccessibility")
    override fun onInterceptTouchEvent(ev: MotionEvent): Boolean {
        if (!swipeEnabled) return false
        when (ev.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                downX = ev.x
                downY = ev.y
                lastX = ev.x
                lastT = ev.eventTime
                velocityX = 0f
                dragging = false
                tracking = true
            }
            MotionEvent.ACTION_MOVE -> {
                if (!tracking) return false
                val dx = ev.x - downX
                val dy = ev.y - downY
                if (!dragging && abs(dx) > touchSlop && abs(dx) > abs(dy) * 1.15f) {
                    dragging = true
                    parent?.requestDisallowInterceptTouchEvent(true)
                    onDragStart?.invoke()
                    return true
                }
            }
            MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                tracking = false
                dragging = false
            }
        }
        return dragging
    }

    @SuppressLint("ClickableViewAccessibility")
    override fun onTouchEvent(event: MotionEvent): Boolean {
        if (!swipeEnabled && !dragging) return super.onTouchEvent(event)
        when (event.actionMasked) {
            MotionEvent.ACTION_MOVE -> {
                if (!dragging) {
                    val dx = event.x - downX
                    val dy = event.y - downY
                    if (abs(dx) > touchSlop && abs(dx) > abs(dy) * 1.15f) {
                        dragging = true
                        parent?.requestDisallowInterceptTouchEvent(true)
                        onDragStart?.invoke()
                    }
                }
                if (dragging) {
                    val now = event.eventTime
                    val dt = (now - lastT).coerceAtLeast(1)
                    velocityX = (event.x - lastX) * 1000f / dt
                    lastX = event.x
                    lastT = now
                    onDrag?.invoke(event.x - downX)
                    return true
                }
            }
            MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                if (dragging) {
                    onDragEnd?.invoke(event.x - downX, velocityX)
                    dragging = false
                    tracking = false
                    return true
                }
                tracking = false
            }
        }
        return dragging || super.onTouchEvent(event)
    }
}
