export default async function handler(req, res) {
    try {
        const { universeId } = req.query
        if (!universeId || isNaN(Number(universeId))) {
            res.status(400).json({ error: "Missing or invalid universeId" })
            return
        }

        let cursor = ""
        const badgeIds = []

        while (true) {
            const r = await fetch(
                `https://games.roblox.com/v1/games/${universeId}/badges?limit=100&cursor=${cursor}`
            )
            if (!r.ok) {
                res.status(200).json({
                    updatedAt: Date.now(),
                    universeId,
                    badges: {},
                    message: "Failed to fetch badge list from Roblox API"
                })
                return
            }

            const data = await r.json()
            if (!data.data || !Array.isArray(data.data)) break
            if (data.data.length === 0 && cursor === "") {
                res.status(200).json({
                    updatedAt: Date.now(),
                    universeId,
                    badges: {},
                    message: "No badges associated with this universeId"
                })
                return
            }

            badgeIds.push(...data.data.map(b => b.id))
            if (!data.nextPageCursor) break
            cursor = data.nextPageCursor
        }

        const badges = {}
        const concurrency = 5
        for (let i = 0; i < badgeIds.length; i += concurrency) {
            const batch = badgeIds.slice(i, i + concurrency)
            await Promise.all(batch.map(async id => {
                try {
                    const r = await fetch(`https://games.roblox.com/v1/games/${uniId}/badges?limit=100&cursor=${cursor}`)
                    if (!r.ok) {
                        const text = await r.text()
                        console.error("Roblox badge list fetch failed:", r.status, text)
                        res.status(200).json({
                            updatedAt: Date.now(),
                            universeId: uniId,
                            badges: {},
                            message: "Failed to fetch badge list from Roblox API"
                        })
                        return
                    }

                } catch (e) { }
            }))
        }

        let message = ""
        if (Object.keys(badges).length === 0) {
            message = "No badges could be fetched successfully"
        }

        res.setHeader("Cache-Control", "public, s-maxage=900, stale-while-revalidate=600")
        res.status(200).json({
            updatedAt: Date.now(),
            universeId,
            badges,
            message
        })

    } catch (err) {
        res.status(200).json({
            updatedAt: Date.now(),
            universeId: req.query.universeId ?? null,
            badges: {},
            message: "Unexpected error occurred"
        })
    }
}


