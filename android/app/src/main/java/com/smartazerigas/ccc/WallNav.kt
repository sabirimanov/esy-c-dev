package com.smartazerigas.ccc

enum class Dashboard {
    OPERATIONS,
    SOCNOC,
}

data class WallNav(
    val dashboard: Dashboard = Dashboard.OPERATIONS,
    val page: Int = 1,
    val overview: Boolean = false,
    /** Mirrors wall `ufgOpen` — swipe only visits active UFG detail slots. */
    val ufgOpen: Boolean = false,
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

    /** Active ops pages while UFG detailed view is open (wall slots 1 / 2 / 8 / 15). */
    val ufgPages: List<Int>
        get() = UFG_PAGES

    fun clamped(page: Int = this.page): WallNav =
        copy(page = page.coerceIn(1, maxPage))

    fun next(): WallNav {
        if (overview) return this
        if (ufgOpen && dashboard == Dashboard.OPERATIONS) {
            val nextPage = UFG_PAGES.firstOrNull { it > page } ?: return this
            return copy(page = nextPage, overview = false)
        }
        return if (page >= maxPage) this else copy(page = page + 1, overview = false)
    }

    fun prev(): WallNav {
        if (overview) return this
        if (ufgOpen && dashboard == Dashboard.OPERATIONS) {
            val prevPage = UFG_PAGES.lastOrNull { it < page } ?: return this
            return copy(page = prevPage, overview = false)
        }
        return if (page <= 1) this else copy(page = page - 1, overview = false)
    }

    fun canNext(): Boolean = next() != this

    fun canPrev(): Boolean = prev() != this

    fun switchDashboard(dashboard: Dashboard): WallNav =
        copy(dashboard = dashboard, page = 1, overview = false, ufgOpen = false)

    fun openFilters(): WallNav = copy(page = filterPage, overview = false)

    fun openOverview(): WallNav = copy(overview = true)

    fun exitOverview(): WallNav = copy(overview = false)

    fun withUfg(open: Boolean): WallNav = copy(ufgOpen = open)

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
        val UFG_PAGES: List<Int> = listOf(1, 2, 8, 15)
    }
}
