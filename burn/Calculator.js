Ext.define('BurnCalculator', {
   extend: 'Rally.data.lookback.calculator.TimeSeriesCalculator',
    config: {
        completedStateNames: [],
        stateField: '',
        calculationType: ''
    },

    constructor: function(config) {
        this.initConfig(config);
        this.callParent(arguments);
    },

    getDerivedFieldsOnInput: function() {
        var completedStateNames = this.getCompletedStateNames(),
            stateField = this.getStateField(),
            calculationType = this.getCalculationType();
        return [
            {
                "as": "Planned",
                "f": function(snapshot) {
                    if(calculationType === 'count') {
                        return 1;
                    }

                    return snapshot.PlanEstimate || 0;
                }
            },
            {
                "as": "PlannedCompleted",
                "f": function(snapshot) {
                    if (_.contains(completedStateNames, snapshot[stateField])) {
                        return calculationType === 'count' ? 1 :
                            (snapshot.PlanEstimate || 0);
                    }

                    return 0;
                }
            }
        ];
    },

    getMetrics: function() {
        return [
            {
                "field": "Planned",
                "as": "Planned",
                "display": "line",
                "f": "sum"
            },
            {
                "field": "PlannedCompleted",
                "as": "Completed",
                "f": "sum",
                "display": "column"
            }
        ];
    }
});