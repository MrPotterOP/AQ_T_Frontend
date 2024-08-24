import moment from 'moment';

const totalsales = async (req, res) => {
    const db = req.app.locals.db;
    const { period, startDate, endDate } = req.query;

    // Parse dates if provided
    const start = startDate ? moment(startDate).toISOString() : null;
    const end = endDate ? moment(endDate).toISOString() : null;

    // Define the date format and grouping logic based on the period
    let dateFormat, groupId;
    if (period === 'daily') {
        dateFormat = '%Y-%m-%d';
        groupId = { $dateToString: { format: dateFormat, date: '$createdAt' } };
    } else if (period === 'weekly') {
        groupId = { $concat: [{ $dateToString: { format: '%Y-', date: '$createdAt' } }, { $toString: { $isoWeek: '$createdAt' } }] };
    } else if (period === 'monthly') {
        dateFormat = '%Y-%m';
        groupId = { $dateToString: { format: dateFormat, date: '$createdAt' } };
    } else if (period === 'quarterly') {
        groupId = { $concat: [{ $dateToString: { format: '%Y-', date: '$createdAt' } }, 'Q', { $toString: { $add: [{ $divide: [{ $month: '$createdAt' }, 3] }, 1] } }] };
    } else if (period === 'yearly') {
        dateFormat = '%Y';
        groupId = { $dateToString: { format: dateFormat, date: '$createdAt' } };
    } else {
        dateFormat = '%Y-%m';
        groupId = { $dateToString: { format: dateFormat, date: '$createdAt' } };
    }

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
                _id: groupId,
                totalSales: { $sum: { $toDouble: '$total_price_set.presentment_money.amount' } }
            }
        },
        {
            $sort: { _id: 1 }
        }
    ];

    const salesData = await db.collection('shopifyOrders').aggregate(pipeline).toArray();

    // Calculate Sales Growth Rate
    let previousPeriodSales = null;

    const formattedResponse = salesData.map((item, index) => {
        const sales = item.totalSales.toFixed(2);
        let growthRate = null;

        if (index > 0) {
            if (previousPeriodSales !== 0) {
                growthRate = (((sales - previousPeriodSales) / previousPeriodSales) * 100).toFixed(2);
            } else {
                growthRate = sales > 0 ? '100.00' : '0.00';
            }
        } else {
            growthRate = 'N/A';
        }

        previousPeriodSales = sales;

        return {
            period: item._id,
            totalSales: sales,
            salesGrowthRate: growthRate !== 'N/A' ? `${growthRate}%` : growthRate
        };
    });

    res.json({ totalSales: formattedResponse });
};

export default totalsales;
