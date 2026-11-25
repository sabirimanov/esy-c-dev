package com.smartazerigas.ccc

import android.annotation.SuppressLint
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.view.WindowManager
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

    private lateinit var webView: WebView
    private lateinit var letterbox: LetterboxLayout
    private lateinit var zoomHost: ZoomPanLayout
    private lateinit var swipeHost: SwipeFrameLayout
    private lateinit var pageBadge: TextView
    private lateinit var fab: FloatingActionButton

    private var nav = WallNav()

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        enterImmersive()

        webView = findViewById(R.id.webView)
        letterbox = findViewById(R.id.letterbox)
        zoomHost = findViewById(R.id.zoomHost)
        swipeHost = findViewById(R.id.swipeHost)
        pageBadge = findViewById(R.id.pageBadge)
        fab = findViewById(R.id.fab)

        configureWebView()

        swipeHost.onSwipeNext = { go(nav.next()) }
        swipeHost.onSwipePrev = { go(nav.prev()) }

        fab.background = getDrawable(R.drawable.bg_fab)
        fab.setOnClickListener { openControls() }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                when {
                    nav.overview -> go(nav.exitOverview())
                    webView.canGoBack() -> webView.goBack()
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
            webView.loadUrl(restored)
            applyChrome()
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
        webView.onResume()
    }

    override fun onPause() {
        webView.onPause()
        super.onPause()
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView() {
        webView.setBackgroundColor(Color.BLACK)
        webView.webChromeClient = WebChromeClient()
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val url = request.url.toString()
                decodeNav(url)?.let { nav = it; applyChrome() }
                return false
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                url ?: return
                decodeNav(url)?.let { nav = it; applyChrome() }
                if (nav.overview) injectOverviewViewport()
            }
        }

        with(webView.settings) {
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

    private fun injectOverviewViewport() {
        val w = nav.overviewWidthPx
        val h = nav.overviewHeightPx
        val js = """
            (function(){
              var m = document.querySelector('meta[name="viewport"]');
              if (!m) {
                m = document.createElement('meta');
                m.name = 'viewport';
                document.head.appendChild(m);
              }
              m.setAttribute('content', 'width=$w, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no');
              document.documentElement.classList.add('is-overview');
              document.documentElement.style.width = '${w}px';
              document.documentElement.style.height = '${h}px';
              document.body.style.width = '${w}px';
              document.body.style.height = '${h}px';
              var root = document.getElementById('root');
              if (root) { root.style.width = '${w}px'; root.style.height = '${h}px'; }
            })();
        """.trimIndent()
        webView.evaluateJavascript(js, null)
    }

    private fun go(next: WallNav, force: Boolean = false) {
        if (!force && next == nav) return
        nav = next.clamped()
        applyChrome()
        webView.loadUrl(nav.url())
    }

    private fun applyChrome() {
        val overview = nav.overview
        letterbox.enabledLetterbox = !overview
        swipeHost.swipeEnabled = !overview
        zoomHost.contentAspect = nav.overviewAspect
        zoomHost.zoomEnabled = overview
        if (overview) zoomHost.resetTransform(requestLayout = true)

        // Overview zoom is handled by ZoomPanLayout; disable WebView's own zoom.
        webView.settings.setSupportZoom(false)
        webView.settings.builtInZoomControls = false

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
