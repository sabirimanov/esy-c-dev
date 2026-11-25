package com.smartazerigas.ccc

import android.annotation.SuppressLint
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.view.ViewTreeObserver
import android.view.WindowManager
import android.view.animation.DecelerateInterpolator
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.TextView
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.google.android.material.bottomsheet.BottomSheetBehavior
import com.google.android.material.bottomsheet.BottomSheetDialog
import com.google.android.material.button.MaterialButton
import com.google.android.material.floatingactionbutton.FloatingActionButton
import com.smartazerigas.ccc.ui.LetterboxLayout
import com.smartazerigas.ccc.ui.SwipeFrameLayout
import com.smartazerigas.ccc.ui.ZoomPanLayout
import kotlin.math.abs

class MainActivity : AppCompatActivity() {

    private lateinit var webA: WebView
    private lateinit var webB: WebView
    private lateinit var front: WebView
    private lateinit var back: WebView
    private lateinit var letterbox: LetterboxLayout
    private lateinit var zoomHost: ZoomPanLayout
    private lateinit var swipeHost: SwipeFrameLayout
    private lateinit var pageBadge: TextView
    private lateinit var fab: FloatingActionButton
    private lateinit var bottomChrome: View

    private var nav = WallNav()
    private var animating = false
    private var dragging = false

    /** Neighbor URL currently loaded (or loading) into [back]. */
    private var backTarget: WallNav? = null
    private var backReady = false
    private var focusPageAfterOverview = -1

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        enterImmersive()

        webA = findViewById(R.id.webA)
        webB = findViewById(R.id.webB)
        front = webA
        back = webB
        letterbox = findViewById(R.id.letterbox)
        zoomHost = findViewById(R.id.zoomHost)
        swipeHost = findViewById(R.id.swipeHost)
        pageBadge = findViewById(R.id.pageBadge)
        fab = findViewById(R.id.fab)
        bottomChrome = findViewById(R.id.bottomChrome)

        configureWebView(webA)
        configureWebView(webB)
        back.visibility = View.INVISIBLE
        reserveBottomChrome()

        zoomHost.onEnterSinglePage = { page ->
            if (nav.overview && !animating) {
                go(nav.copy(overview = false, page = page).clamped())
            }
        }
        zoomHost.onPinchOut = {
            if (!nav.overview && !animating) {
                focusPageAfterOverview = nav.page
                go(nav.openOverview())
            }
        }

        swipeHost.onDragStart = { onPageDragStart() }
        swipeHost.onDrag = { dx -> onPageDrag(dx) }
        swipeHost.onDragEnd = { dx, vx -> onPageDragEnd(dx, vx) }

        fab.background = getDrawable(R.drawable.bg_fab)
        fab.setOnClickListener { openControls() }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                when {
                    nav.overview -> go(nav.exitOverview())
                    else -> {
                        isEnabled = false
                        onBackPressedDispatcher.onBackPressed()
                        isEnabled = true
                    }
                }
            }
        })

        val restored = savedInstanceState?.getString(STATE_URL)
        if (restored != null) {
            nav = decodeNav(restored) ?: nav
            applyChrome()
            front.loadUrl(nav.url())
            preloadNeighbors()
        } else {
            go(nav, force = true)
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        outState.putString(STATE_URL, nav.url())
    }

    override fun onResume() {
        super.onResume()
        enterImmersive()
        webA.onResume()
        webB.onResume()
    }

    override fun onPause() {
        webA.onPause()
        webB.onPause()
        super.onPause()
    }

    override fun onDestroy() {
        webA.destroy()
        webB.destroy()
        super.onDestroy()
    }

    private fun reserveBottomChrome() {
        bottomChrome.viewTreeObserver.addOnGlobalLayoutListener(object : ViewTreeObserver.OnGlobalLayoutListener {
            override fun onGlobalLayout() {
                letterbox.bottomReservePx = bottomChrome.height
                if (bottomChrome.height > 0) {
                    bottomChrome.viewTreeObserver.removeOnGlobalLayoutListener(this)
                }
            }
        })
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView(web: WebView) {
        web.setBackgroundColor(Color.BLACK)
        web.webChromeClient = WebChromeClient()
        web.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean = false

            override fun onPageFinished(view: WebView?, url: String?) {
                if (view === back && backTarget != null) {
                    backReady = true
                }
                if (view === front && nav.overview && focusPageAfterOverview > 0) {
                    val page = focusPageAfterOverview
                    focusPageAfterOverview = -1
                    zoomHost.post {
                        zoomHost.focusPage(page, animate = true)
                    }
                }
            }
        }

        with(web.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true
            mediaPlaybackRequiresUserGesture = false
            mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
            cacheMode = WebSettings.LOAD_DEFAULT
            useWideViewPort = true
            loadWithOverviewMode = true
            builtInZoomControls = false
            displayZoomControls = false
            setSupportZoom(false)
            textZoom = 100
            userAgentString = "$userAgentString SmartAzerigasCCC/1.0"
        }
    }

    private fun pageWidth(): Float =
        front.width.toFloat().takeIf { it > 0 } ?: resources.displayMetrics.widthPixels.toFloat()

    private fun ensureNeighbor(direction: Int) {
        val target = if (direction > 0) nav.next() else nav.prev()
        if (target == nav) return
        if (backTarget == target && (backReady || back.url == target.url())) return
        backTarget = target
        backReady = false
        back.loadUrl(target.url())
    }

    private fun preloadNeighbors() {
        if (nav.overview) return
        // Prefer next page warm in the buffer.
        ensureNeighbor(+1)
    }

    private fun onPageDragStart() {
        if (nav.overview || animating) return
        dragging = true
    }

    private fun onPageDrag(dx: Float) {
        if (!dragging || nav.overview || animating) return
        val w = pageWidth()
        // Rubber-band at edges
        val atStart = nav.page <= 1 && dx > 0
        val atEnd = nav.page >= nav.maxPage && dx < 0
        val drag = when {
            atStart || atEnd -> dx * 0.35f
            else -> dx
        }
        front.translationX = drag

        val direction = if (dx < 0) +1 else -1
        val target = if (direction > 0) nav.next() else nav.prev()
        if (target != nav) {
            ensureNeighbor(direction)
            back.visibility = View.VISIBLE
            back.translationX = drag + direction * w
            // Keep peek behind front when overlapping
            if (abs(drag) > 4f) back.bringToFront()
            front.bringToFront()
        } else {
            back.visibility = View.INVISIBLE
        }
    }

    private fun onPageDragEnd(dx: Float, velocityX: Float) {
        if (!dragging) return
        dragging = false
        if (nav.overview || animating) {
            snapBack()
            return
        }

        val w = pageWidth()
        val threshold = w * 0.22f
        // Finger left (dx < 0) → next; finger right → previous.
        val goNext = dx < -threshold || velocityX < -900f
        val goPrev = dx > threshold || velocityX > 900f
        val target = when {
            goNext -> nav.next()
            goPrev -> nav.prev()
            else -> nav
        }

        if (target == nav) {
            snapBack()
            return
        }

        val direction = if (goNext) +1 else -1
        ensureNeighbor(direction)
        completeDragTo(target, direction)
    }

    private fun snapBack() {
        animating = true
        swipeHost.swipeEnabled = false
        front.animate()
            .translationX(0f)
            .setDuration(180)
            .setInterpolator(DecelerateInterpolator())
            .withEndAction {
                back.visibility = View.INVISIBLE
                back.translationX = 0f
                animating = false
                swipeHost.swipeEnabled = !nav.overview
                preloadNeighbors()
            }
            .start()
        back.animate().translationX(pageWidth()).setDuration(180).start()
    }

    private fun completeDragTo(target: WallNav, direction: Int) {
        animating = true
        swipeHost.swipeEnabled = false
        nav = target.clamped()
        applyChrome()

        val w = pageWidth()
        // If back isn't the right page yet, force-load and wait briefly via visibility.
        if (backTarget != target) {
            backTarget = target
            backReady = false
            back.loadUrl(target.url())
        }
        back.visibility = View.VISIBLE
        if (back.translationX == 0f && front.translationX == 0f) {
            back.translationX = direction * w
        }

        front.animate()
            .translationX(-direction * w)
            .setDuration(220)
            .setInterpolator(DecelerateInterpolator())
            .start()

        back.animate()
            .translationX(0f)
            .setDuration(220)
            .setInterpolator(DecelerateInterpolator())
            .withEndAction {
                val old = front
                front = back
                back = old
                back.animate().cancel()
                back.translationX = 0f
                back.visibility = View.INVISIBLE
                front.translationX = 0f
                front.visibility = View.VISIBLE
                backTarget = null
                backReady = false
                animating = false
                swipeHost.swipeEnabled = !nav.overview
                preloadNeighbors()
            }
            .start()
    }

    private fun go(next: WallNav, force: Boolean = false) {
        if (!force && next == nav) return
        if (animating || dragging) return
        nav = next.clamped()
        applyChrome()
        front.animate().cancel()
        back.animate().cancel()
        front.translationX = 0f
        back.translationX = 0f
        back.visibility = View.INVISIBLE
        backTarget = null
        backReady = false
        front.loadUrl(nav.url())
        if (!nav.overview) preloadNeighbors()
    }

    private fun applyChrome() {
        val overview = nav.overview
        letterbox.enabledLetterbox = !overview
        swipeHost.swipeEnabled = !overview && !animating && !dragging
        zoomHost.gridCols = if (nav.dashboard == Dashboard.OPERATIONS) 7 else 4
        zoomHost.gridRows = 3
        zoomHost.zoomEnabled = overview
        zoomHost.pinchOutEnabled = !overview
        if (overview && focusPageAfterOverview <= 0) {
            zoomHost.resetTransform(animate = false)
        }

        pageBadge.text = if (overview) {
            getString(R.string.view_all)
        } else {
            getString(R.string.page_label, nav.page, nav.maxPage)
        }
    }

    private fun openControls() {
        val dialog = BottomSheetDialog(this, R.style.Theme_SmartAzerigasCCC_BottomSheet)
        val sheet = layoutInflater.inflate(R.layout.sheet_controls, null)
        dialog.setContentView(sheet)

        dialog.setOnShowListener {
            val bottomSheet = dialog.findViewById<View>(com.google.android.material.R.id.design_bottom_sheet)
            bottomSheet?.let { view ->
                val behavior = BottomSheetBehavior.from(view)
                behavior.skipCollapsed = true
                behavior.isFitToContents = true
                behavior.state = BottomSheetBehavior.STATE_EXPANDED
            }
        }

        val pageLabel = sheet.findViewById<TextView>(R.id.sheetPageLabel)
        val btnOps = sheet.findViewById<MaterialButton>(R.id.btnOperations)
        val btnSoc = sheet.findViewById<MaterialButton>(R.id.btnSocnoc)
        val btnFilters = sheet.findViewById<MaterialButton>(R.id.btnFilters)
        val btnViewAll = sheet.findViewById<MaterialButton>(R.id.btnViewAll)
        val btnBack = sheet.findViewById<MaterialButton>(R.id.btnBackToPage)

        pageLabel.text = if (nav.overview) {
            getString(R.string.view_all)
        } else {
            getString(R.string.page_label, nav.page, nav.maxPage)
        }

        styleDashboardChip(btnOps, selected = nav.dashboard == Dashboard.OPERATIONS)
        styleDashboardChip(btnSoc, selected = nav.dashboard == Dashboard.SOCNOC)
        btnBack.visibility = if (nav.overview) View.VISIBLE else View.GONE
        btnViewAll.text = getString(if (nav.overview) R.string.back_to_page else R.string.view_all)

        btnOps.setOnClickListener {
            dialog.dismiss()
            go(nav.switchDashboard(Dashboard.OPERATIONS))
        }
        btnSoc.setOnClickListener {
            dialog.dismiss()
            go(nav.switchDashboard(Dashboard.SOCNOC))
        }
        btnFilters.setOnClickListener {
            dialog.dismiss()
            go(nav.openFilters())
        }
        btnViewAll.setOnClickListener {
            dialog.dismiss()
            focusPageAfterOverview = -1
            go(if (nav.overview) nav.exitOverview() else nav.openOverview())
        }
        btnBack.setOnClickListener {
            dialog.dismiss()
            go(nav.exitOverview())
        }

        dialog.show()
    }

    private fun styleDashboardChip(button: MaterialButton, selected: Boolean) {
        button.setBackgroundResource(if (selected) R.drawable.bg_chip_selected else R.drawable.bg_chip)
        button.setTextColor(getColor(if (selected) R.color.ccc_cyan else R.color.ccc_text))
        button.strokeWidth = 0
    }

    private fun enterImmersive() {
        WindowCompat.setDecorFitsSystemWindows(window, false)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        val controller = WindowInsetsControllerCompat(window, window.decorView)
        controller.hide(WindowInsetsCompat.Type.systemBars())
        controller.systemBarsBehavior =
            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
    }

    private fun decodeNav(url: String): WallNav? {
        val uri = runCatching { android.net.Uri.parse(url) }.getOrNull() ?: return null
        val path = uri.path?.trimEnd('/') ?: return null
        return when {
            path == "/overview" -> WallNav(Dashboard.OPERATIONS, overview = true)
            path == "/socnoc/overview" -> WallNav(Dashboard.SOCNOC, overview = true)
            path.startsWith("/socnoc/") -> {
                val id = path.removePrefix("/socnoc/").toIntOrNull() ?: return null
                WallNav(Dashboard.SOCNOC, page = id).clamped()
            }
            path.matches(Regex("/\\d+")) -> {
                val id = path.removePrefix("/").toIntOrNull() ?: return null
                WallNav(Dashboard.OPERATIONS, page = id).clamped()
            }
            else -> null
        }
    }

    companion object {
        private const val STATE_URL = "state_url"
    }
}
