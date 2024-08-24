import moment from 'moment';

const clvByCohorts = async (req, res) => {
    const db = req.app.locals.db;
    const { startDate, endDate } = req.query;

    // Parse dates if provided
    const start = startDate ? moment(startDate).toISOString() : null;
    const end = endDate ? moment(endDate).toISOString() : null;

    const matchStage = {};
    if (start) matchStage.$gte = start;
    if (end) matchStage.$lte = end;

    const pipeline = [
        {
            $addFields: {
                createdAt: { $dateFromString: { dateString: '$created_at' } }
            }
        },
        {
            $match: {
                ...(start || end ? { createdAt: matchStage } : {}),
            }
        },
        {
            $group: {
                _id: {
                    customerId: '$customer.id.low',
                    cohortMonth: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }
                },
                totalSpent: { $sum: { $toDouble: '$total_price' } }
            }
        },
        {
            $group: {
                _id: '$_id.cohortMonth',
                totalCLV: { $sum: '$totalSpent' }
            }
        },
        {
            $sort: { _id: 1 }
        }
    ];

    const clvData = await db.collection('shopifyOrders').aggregate(pipeline).toArray();

    // Prepare response
    const formattedResponse = clvData.map(item => ({
        cohortMonth: item._id,
        totalCLV: item.totalCLV.toFixed(2)
    }));

    res.json({ clvByCohorts: formattedResponse });
};

export default clvByCohorts;
