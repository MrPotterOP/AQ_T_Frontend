import moment from 'moment';

const newCustomers = async (req, res) => {
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
                newCustomers: { $sum: 1 }
            }
        },
        {
            $sort: { _id: 1 }
        }
    ];

    const newCustomersData = await db.collection('shopifyCustomers').aggregate(pipeline).toArray();

    // Calculate New Customers Growth Rate
    let previousPeriodNewCustomers = null;
    const formattedResponse = newCustomersData.map((item) => {
        const currentNewCustomers = item.newCustomers;
        let growthRate = 'N/A';

        if (previousPeriodNewCustomers !== null) {
            growthRate = ((currentNewCustomers - previousPeriodNewCustomers) / previousPeriodNewCustomers * 100).toFixed(2);
        }

        previousPeriodNewCustomers = currentNewCustomers;

        return {
            period: item._id,
            newCustomers: currentNewCustomers,
            newCustomersGrowthRate: growthRate !== 'N/A' ? `${growthRate}%` : growthRate
        };
    });

    res.json({ newCustomers: formattedResponse });
};

export default newCustomers;
