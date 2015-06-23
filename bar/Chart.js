
Ext.define('BarChart', {
    extend: 'Ext.Container',
    alias: 'widget.barchart',
    config: {
        types: [],
        context: undefined
    },
    
    layout: {
        type: 'hbox',
        align: 'stretch'
    },
    
    initComponent: function() {
        this.callParent(arguments);
        Rally.data.ModelFactory.getModels({
            types: this.types
        }).then({
            success: this._addControls,
            scope: this
        }).then({
            success: this._getData,
            scope: this
        });
    },
    
    refresh: function (config) {
        var me = this;
        Ext.apply(this, config);
        if(this.down('rallychart')) {
            this.down('rallychart').destroy();
        }
        
        //this._showChart();


        Rally.data.ModelFactory.getModels({
            types: this.types
        }).then({
            success: this._getData,
            scope: this
        }).always(function () {
            me.setLoading(false);
        });

        this.down('#filterSummary').update(this._getFilterSummaryHtml());
    },

    _getData: function (models) {
        var deferred = Ext.create('Deft.Deferred');

        console.log('Getting data for bar chart', models);

        var store = Ext.create('Rally.data.wsapi.artifact.Store', {
            models: models,
            //models: this.types,
            context: this.getContext().getDataContext(),
            limit: Infinity,
            filters: this.filters,
            autoLoad: true,
            listeners: {
                scope: this,
                load: this._processData
            }
        });
        console.log('Call to WSAPI store complete.');

        return deferred;

        //storeType: 'Rally.data.wsapi.artifact.Store',
        //storeConfig: {
        //    models: this.types,
        //    context: this.getContext().getDataContext(),
        //    limit: Infinity,
        //    filters: this.filters
        //}
    },

    _processData: function (store, records, successful) {

        console.log('returned store: ', store);

        var barCalculationType = this.down('radiogroup').getValue().barCalculationType;
        var field = this.down('#barXaxis').getValue();
        
        // Skip over populating chart if nothing is selected in X-axis
        if (field) {
            var categories, seriesData, data;
            if (barCalculationType === 'count') {
                data = _.countBy(store.getRange(), function (record) {
                    return record.get(field);
                }, this);
                categories = _.keys(data);
                seriesData = [];
                _.each(data, function (value, key) {
                    seriesData.push([key, value]);
                });
            } else {
                data = _.groupBy(store.getRange(), function (record) {
                    return record.get(field);
                }, this);
                categories = _.keys(data);
                seriesData = [];
                _.each(data, function (value, key) {
                    seriesData.push([key, _.reduce(value, function (total, r) {
                        return total + r.get('PlanEstimate');
                    }, 0)]);
                });
            }
           
            var graph = {
                xAxis: {
                    categories: categories
                },
                yAxis: {
                    min: 0,
                    title: {
                        text: 'I have the text I am looking for'
                    },
                    stackLabels: {
                        enabled: true,
                        style: {
                            fontWeight: 'bold',
                            color: 'gray' //||(Highcharts.theme && Highcharts.theme.textColor)
                        }
                    }
                },
                series: [
                    {
                        name: 'Schedule State',
                        type: 'column',
                        data: seriesData
                    }
                ]
            };

            this._showChart(graph);
        }

    },
    
    _addControls: function(models) {
        var wiTypes = _.values(models);
        var validFields = this._getValidFields(wiTypes);
        
        this.add([
            {
                xtype: 'component',
                flex: 1
            }, 
            {
                xtype: 'container',
                items: [{
                    width: 250,
                    margin: '100px 0 0 0',
                    xtype: 'rallycombobox',
                    itemId: 'barXaxis',
                    fieldLabel: 'X-axis:',
                    labelAlign: 'top',
                    labelWidth: 60,
                    displayField: 'displayName',
                    valueField: 'name',
                    editable: false,
                    stateful: true,
                    stateId: this.getContext().getScopedStateId('barXaxis'),
                    store: Ext.create('Ext.data.Store', {
                        fields: ['name', 'displayName'],
                        data: _.map(validFields, function(field) {
                            return {
                                displayName: Rally.ui.renderer.FieldDisplayNameRenderer.getDisplayName(field),
                                name: field.name
                            };
                        })
                    }),
                    applyState: function(state) {
                        //hack alert
                        //this function is necessary to work around a defect in the sdk
                        Rally.ui.combobox.ComboBox.superclass.applyState.call(this, state);
                    },
                    listeners: {
                        select: function() {
                            this.refresh();
                        },
                        scope: this
                    }
                },
                {
                    width: 250,
                    margin: '100px 0 0 0',
                    xtype: 'rallycombobox',
                    itemId: 'barSlicer',
                    fieldLabel: 'Bar Slicer:',
                    labelAlign: 'top',
                    labelWidth: 60,
                    displayField: 'displayName',
                    valueField: 'name',
                    editable: false,
                    stateful: true,
                    stateId: this.getContext().getScopedStateId('barSlicer'),
                    store: Ext.create('Ext.data.Store', {
                        fields: ['name', 'displayName'],
                        data: _.map(validFields, function(field) {
                            return {
                                displayName: Rally.ui.renderer.FieldDisplayNameRenderer.getDisplayName(field),
                                name: field.name
                            };
                        })
                    }),
                    applyState: function(state) {
                        //hack alert
                        //this function is necessary to work around a defect in the sdk
                        Rally.ui.combobox.ComboBox.superclass.applyState.call(this, state);
                    },
                    listeners: {
                        select: function() {
                            this.refresh();
                        },
                        scope: this
                    }
                },
                {
                    xtype: 'radiogroup',
                    fieldLabel: 'Y-axis selection',
                    stateful: true,
                    stateId: this.getContext().getScopedStateId('barCalculationType'),
                    columns: 1,
                    items: [
                        { boxLabel: 'Plan Estimate Sum', name: 'barCalculationType', inputValue: 'sum' },
                        { boxLabel: 'Work Item Count', name: 'barCalculationType', inputValue: 'count', checked: true}
                    ],
                     listeners: {
                        change: function() {
                            this.refresh();
                        },
                        scope: this
                    }
                }]
            },
            {
                xtype: 'component',
                width: 250,
                itemId: 'filterSummary',
                margin: '100px 0 0 0',
                html: this._getFilterSummaryHtml()
            },
            {
                xtype: 'component',
                flex: 1
            }
        ]);
        
        return models;
        //if (graph)
        //    this._showChart(graph);
    },
    
    _getFilterSummaryHtml: function() {
        return Ext.String.format('<ul>{0}</ul>', _.map(this.filters, function(filter) {
            return Ext.String.format('<li>{0}</li>', filter.toString());
        }).join(''));
    },
    
    _showChart: function (graph) {

        console.log('Here is the graph: ', graph);
        console.log('X categories: ', graph.xAxis.categories);

       this.insert(2, {
            xtype: 'rallychart',
            flex: 10,
            //storeType: 'Rally.data.wsapi.artifact.Store',
            //storeConfig: {
            //    models: this.types,
            //    context: this.getContext().getDataContext(),
            //    limit: Infinity,
            //    filters: this.filters
            //},
            //calculatorType: 'BarCalculator',
            //calculatorConfig: {
            //    barCalculationType: this.down('radiogroup').getValue().barCalculationType,
            //    field: this.down('#barXaxis').getValue()
            //},
            chartData: graph,
            chartConfig: {
                chart: { type: 'column' },
                title: { 
                    text: Ext.String.format('{0} - {1}', 
                        this.getContext().getProject().Name,
                        _.map(this.types, function(type) {
                            return Rally.util.TypeInfo.getTypeInfoByName(type).typeName; 
                        }).join(', '))
                },
                xAxis: { categories: graph.xAxis.categories },
                yAxis: {
                    min: 0,
                    title: {
                        text: this.down('radiogroup').getValue().barCalculationType
                    },
                    stackLabels: {
                        enabled: true,
                        style: {
                            fontWeight: 'bold',
                            color: 'gray'
                        }
                    }
                },
                plotOptions: {
                    column: {
                        stacking: 'normal',
                        dataLabels: {
                            enabled: true,
                            color: 'white', //(Highcharts.theme && Highcharts.theme.dataLabelsColor)
                            style: {
                                textShadow: '0 0 3px black'
                            }
                        }
                    }
                }
            }
        });  
    },
    
    _getValidFields: function(models) {
        this.model = this._getArtifactModel(models);
        var fields = _(this.model.getFields()).filter(this._shouldShowField, this).sortBy('displayName').value();
        return _.filter(fields, function(field) {
            return _.every(models, function(model) {
                return model.hasField(field.name);
            });
        }, this);
    },

    _getArtifactModel: function(models) {
        return Rally.data.wsapi.ModelBuilder.buildCompositeArtifact(models, this.getContext());
    },

    _shouldShowField: function(field) {
        return !field.hidden && field.attributeDefinition && field.getType() !== 'collection';
    }
});