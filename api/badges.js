export default async function handler(req, res) {
    const { gameId, universeId } = req.query
    let uniId = null

    try {
        if (universeId && !isNaN(Number(universeId))) {
            uniId = Number(universeId)
        } else if (gameId && !isNaN(Number(gameId))) {
            try {
                const r = await fetch(`https://apis.roblox.com/universes/v1/places/${gameId}/universe`)
                if (!r.ok) throw new Error(`HTTP ${r.status}`)
                const data = await r.json()
                uniId = data?.universeId
                if (!uniId) throw new Error("UniverseId not found for this gameId")
            } catch (e) {
                res.status(200).json({
                    updatedAt: Date.now(),
                    badges: {},
                    message: `Failed to convert gameId to universeId: ${e.message}`
                })
                return
            }
        } else {
            res.status(400).json({ error: "Missing or invalid universeId/gameId" })
            return
        }

        let cursor = ""
        const badges = {}

        while (true) {
            let data
            try {
                const r = await fetch(`https://badges.roblox.com/v1/universes/${uniId}/badges?limit=100&cursor=${cursor}`)
                if (!r.ok) {
                    let text = ""
                    try { text = await r.text() } catch { }
                    res.status(200).json({
                        updatedAt: Date.now(),
                        universeId: uniId,
                        badges: {},
                        message: `Failed to fetch badge list from Roblox API (status: ${r.status}, body: ${text})`
                    })
                    return
                }
                data = await r.json()
            } catch (e) {
                res.status(200).json({
                    updatedAt: Date.now(),
                    universeId: uniId,
                    badges: {},
                    message: `Error fetching badge list: ${e.message}`
                })
                return
            }

            if (!data.data || !Array.isArray(data.data)) break
            if (data.data.length === 0 && cursor === "") {
                res.status(200).json({
                    updatedAt: Date.now(),
                    universeId: uniId,
                    badges: {},
                    message: "No badges associated with this universeId"
                })
                return
            }

            for (const b of data.data) {
                badges[b.id] = {
                    BadgeName: b.name ?? "Unknown",
                    BadgeDescription: b.description ?? "",
                    BadgeIconId: b.iconImageId ?? "",
                    VictorCount: b.statistics?.awardedCount ?? 0
                }
            }

            if (!data.nextPageCursor) break
            cursor = data.nextPageCursor
        }

        let message = ""
        if (Object.keys(badges).length === 0) {
            message = "No badges could be fetched successfully"
        }

        res.setHeader("Cache-Control", "public, s-maxage=900, stale-while-revalidate=600")
        res.status(200).json({
            updatedAt: Date.now(),
            universeId: uniId,
            badges,
            message
        })

    } catch (err) {
        res.status(200).json({
            updatedAt: Date.now(),
            universeId: null,
            badges: {},
            message: `Unexpected error occurred: ${err.message}`
        })
    }
}
