Ext.define('CfdCalculator', {
   extend: 'Rally.data.lookback.calculator.TimeSeriesCalculator',
    config: {
        stateFieldName: '',
        stateFieldValues: [],
        calculationType: ''
    },

    constructor: function(config) {
        this.initConfig(config);
        this.callParent(arguments);
    },

    getMetrics: function() {
        if(this.getCalculationType() === 'count') {
            return _.map(this.getStateFieldValues(), function(stateFieldValue) {
                return  {
                    as: stateFieldValue,
                    groupByField: this.getStateFieldName(),
                    allowedValues: [stateFieldValue],
                    f: 'groupByCount',
                    display: 'area'
                };
            }, this);
        } else {
            return _.map(this.getStateFieldValues(), function(stateFieldValue) {
                return  {
                    as: stateFieldValue,
                    groupByField: this.getStateFieldName(),
                    field: 'PlanEstimate',
                    allowedValues: [stateFieldValue],
                    f: 'groupBySum',
                    display: 'area'
                };
            }, this);
        }
    }
});