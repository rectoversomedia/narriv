export const getSummary = async (req, res) => {
    try {
        const response = {
            kpis: {},
            trends: [],
            distribution: {},
            latest_signals: []
        };
        
        res.status(200).json(response);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
