package com.smartazerigas.ccc

enum class Dashboard {
    OPERATIONS,
    SOCNOC,
}

data class WallNav(
    val dashboard: Dashboard = Dashboard.OPERATIONS,
    val page: Int = 1,
    val overview: Boolean = false,
) {
    val maxPage: Int
        get() = when (dashboard) {
            Dashboard.OPERATIONS -> 21
            Dashboard.SOCNOC -> 12
        }

    val filterPage: Int
        get() = when (dashboard) {
            Dashboard.OPERATIONS -> 5
            // SOC/NOC calendar / filters live on screen 1
            Dashboard.SOCNOC -> 1
        }

    fun clamped(page: Int = this.page): WallNav =
        copy(page = page.coerceIn(1, maxPage))

    fun next(): WallNav = if (page >= maxPage) this else copy(page = page + 1, overview = false)

    fun prev(): WallNav = if (page <= 1) this else copy(page = page - 1, overview = false)

    fun switchDashboard(dashboard: Dashboard): WallNav =
        copy(dashboard = dashboard, page = 1, overview = false)

    fun openFilters(): WallNav = copy(page = filterPage, overview = false)

    fun openOverview(): WallNav = copy(overview = true)

    fun exitOverview(): WallNav = copy(overview = false)

    /** Full wall canvas size in CSS px (for View All zoom host). */
    val overviewWidthPx: Int
        get() = when (dashboard) {
            Dashboard.OPERATIONS -> 7 * 1920
            Dashboard.SOCNOC -> 4 * 1920
        }

    val overviewHeightPx: Int
        get() = 3 * 1080

    val overviewAspect: Float
        get() = overviewWidthPx.toFloat() / overviewHeightPx.toFloat()

    fun path(): String = when {
        overview && dashboard == Dashboard.OPERATIONS -> "/overview"
        overview && dashboard == Dashboard.SOCNOC -> "/socnoc/overview"
        dashboard == Dashboard.SOCNOC -> "/socnoc/$page"
        else -> "/$page"
    }

    fun url(base: String = BASE_URL): String {
        val root = base.trimEnd('/')
        return "$root${path()}?tablet=1&noborder=1"
    }

    companion object {
        const val BASE_URL = "https://cccdev.esyasoft.app"
    }
}
