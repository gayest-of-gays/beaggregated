export default async function handler(req, res) {
    try {
        const { gameId } = req.query
        if (!gameId || isNaN(Number(gameId))) {
            res.status(400).json({ error: "Missing or invalid gameId" })
            return
        }

        let cursor = ""
        const badgeIds = []

        while (true) {
            const r = await fetch(
                `https://games.roblox.com/v1/games/${gameId}/badges?limit=100&cursor=${cursor}`
            )
            if (!r.ok) break
            const data = await r.json()
            if (!data.data || !Array.isArray(data.data)) break
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
                    const r = await fetch(`https://badges.roblox.com/v1/badges/${id}`)
                    if (!r.ok) return
                    const b = await r.json()
                    badges[id] = {
                        BadgeName: b.name ?? "Unknown",
                        BadgeDescription: b.description ?? "",
                        ObtainmentDetails: "Earn this badge in game",
                        IsLimited: b.isEnabled === false,
                        Difficulty: 0,
                        VictorCount: b.statistics?.awardedCount ?? 0
                    }
                } catch { }
            }))
        }

        res.setHeader("Cache-Control", "public, s-maxage=900, stale-while-revalidate=600")
        res.status(200).json({ updatedAt: Date.now(), gameId, badges })

    } catch {
        res.status(200).json({ updatedAt: Date.now(), gameId, badges: {} })
    }
}

