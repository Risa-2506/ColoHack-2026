const Bed = require("../models/Bed");

/**
 * GET /api/wards
 * Returns a summary for each ward: name, totalBeds, occupiedBeds, percentage
 * Groups all Bed documents by their "ward" field
 */
async function getWardsSummary(req, res) {
  try {
    // Aggregate beds grouped by ward name
    const wardAgg = await Bed.aggregate([
      {
        $group: {
          _id: "$ward",
          totalBeds: { $sum: 1 },
          occupiedBeds: {
            $sum: { $cond: [{ $eq: ["$status", "occupied"] }, 1, 0] },
          },
          availableBeds: {
            $sum: { $cond: [{ $eq: ["$status", "available"] }, 1, 0] },
          },
          cleaningBeds: {
            $sum: { $cond: [{ $eq: ["$status", "cleaning"] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          name: "$_id",
          totalBeds: 1,
          occupiedBeds: 1,
          availableBeds: 1,
          cleaningBeds: 1,
          percentage: {
            $cond: [
              { $gt: ["$totalBeds", 0] },
              {
                $round: [
                  {
                    $multiply: [
                      { $divide: ["$occupiedBeds", "$totalBeds"] },
                      100,
                    ],
                  },
                  2,
                ],
              },
              0,
            ],
          },
        },
      },
      { $sort: { name: 1 } },
    ]);

    res.json(wardAgg);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = { getWardsSummary };
