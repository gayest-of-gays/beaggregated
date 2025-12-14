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

            if (!r.ok) throw new Error(`Failed to fetch badge list for gameId ${gameId}`)

            const data = await r.json()
            badgeIds.push(...data.data.map(b => b.id))

            if (!data.nextPageCursor) break
            cursor = data.nextPageCursor
        }

        const badges = {}

        await Promise.all(
            badgeIds.map(async (id) => {
                const r = await fetch(`https://badges.roblox.com/v1/badges/${id}`)
                if (!r.ok) return

                const b = await r.json()
                badges[id] = {
                    BadgeName: b.name,
                    BadgeDescription: b.description,
                    ObtainmentDetails: "Placeholder",
                    IsLimited: b.isEnabled === false,
                    Difficulty: 0,
                    VictorCount: b.statistics?.awardedCount ?? 0
                }
            })
        )
        res.setHeader(
            "Cache-Control",
            "public, s-maxage=900, stale-while-revalidate=600"
        )
        res.status(200).json({
            updatedAt: Date.now(),
            gameId,
            badges
        })

    } catch (err) {
        console.error(err)
        res.status(500).json({ error: err.message })
    }
}
