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
    private var pendingReveal: WebView? = null
    private var slideDirection = 1

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

        zoomHost.onTransformChanged = { scale, tx, ty ->
            if (nav.overview) {
                val js =
                    "window.__CCC_OVERVIEW_ZOOM&&window.__CCC_OVERVIEW_ZOOM($scale,$tx,$ty,${zoomHost.width},${zoomHost.height});" +
                        "window.dispatchEvent(new CustomEvent('ccc-overview-zoom',{detail:{scale:$scale,transX:$tx,transY:$ty,viewW:${zoomHost.width},viewH:${zoomHost.height}}}));"
                front.evaluateJavascript(js, null)
            }
        }

        swipeHost.onSwipeNext = { slideTo(nav.next(), direction = 1) }
        swipeHost.onSwipePrev = { slideTo(nav.prev(), direction = -1) }

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
                if (view != null && view === pendingReveal) {
                    pendingReveal = null
                    finishSlideIn(view)
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

    private fun go(next: WallNav, force: Boolean = false) {
        if (!force && next == nav) return
        if (animating) return
        nav = next.clamped()
        applyChrome()
        front.translationX = 0f
        back.translationX = 0f
        back.visibility = View.INVISIBLE
        front.visibility = View.VISIBLE
        pendingReveal = null
        front.loadUrl(nav.url())
    }

    /**
     * @param direction +1 = next page (content slides left), -1 = previous (slides right)
     */
    private fun slideTo(next: WallNav, direction: Int) {
        if (animating || next == nav || nav.overview) return
        animating = true
        swipeHost.swipeEnabled = false
        nav = next.clamped()
        applyChrome()

        val width = front.width.toFloat().takeIf { it > 0 } ?: resources.displayMetrics.widthPixels.toFloat()
        slideDirection = direction
        pendingReveal = back
        back.translationX = direction * width
        back.visibility = View.INVISIBLE
        back.loadUrl(nav.url())
    }

    private fun finishSlideIn(incoming: WebView) {
        val width = front.width.toFloat().takeIf { it > 0 } ?: resources.displayMetrics.widthPixels.toFloat()
        val direction = slideDirection
        val outgoing = front

        incoming.translationX = direction * width
        incoming.visibility = View.VISIBLE
        incoming.bringToFront()

        outgoing.animate()
            .translationX(-direction * width)
            .setDuration(240)
            .setInterpolator(DecelerateInterpolator())
            .start()

        incoming.animate()
            .translationX(0f)
            .setDuration(240)
            .setInterpolator(DecelerateInterpolator())
            .withEndAction {
                front = incoming
                back = if (front === webA) webB else webA
                outgoing.animate().cancel()
                back.animate().cancel()
                back.translationX = 0f
                back.visibility = View.INVISIBLE
                front.translationX = 0f
                front.visibility = View.VISIBLE
                animating = false
                swipeHost.swipeEnabled = !nav.overview
            }
            .start()
    }

    private fun applyChrome() {
        val overview = nav.overview
        letterbox.enabledLetterbox = !overview
        swipeHost.swipeEnabled = !overview && !animating
        zoomHost.zoomEnabled = overview
        if (overview) zoomHost.resetTransform(requestLayout = false)

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
