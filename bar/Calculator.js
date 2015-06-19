Ext.define('BarCalculator', {
    config: {
        barCalculationType: undefined,
        field: undefined
    },
    
    constructor: function(config) {
        this.initConfig(config);    
    },
    
    prepareChartData: function(store) {
        var categories, seriesData, data;
        if(this.barCalculationType === 'count') {
            data = _.countBy(store.getRange(), function(record) { 
                return record.get(this.field); 
            }, this);
            categories = _.keys(data);
            seriesData = [];
            _.each(data, function(value, key) {
                seriesData.push([key, value]);    
            });
        } else {
            data = _.groupBy(store.getRange(), function(record) {
                return record.get(this.field);
            }, this);
            categories = _.keys(data);
            seriesData = [];
            _.each(data, function(value, key) {
                seriesData.push([key, _.reduce(value, function(total, r) {
                    return total + r.get('PlanEstimate');
                }, 0)]);
            });
        }
        
        return {
            xAxis: {
                categories: categories
            },
            yAxis: {
                min: 0,
                title: {
                    text: 'Total fruit consumption'
                },
                stackLabels: {
                    enabled: true,
                    style: {
                        fontWeight: 'bold',
                        color: (Highcharts.theme && Highcharts.theme.textColor) || 'gray'
                    }
                }
            },
            series: [
                {
                    type: 'column',
                    data: seriesData
                }
            ]
        };
    }
});