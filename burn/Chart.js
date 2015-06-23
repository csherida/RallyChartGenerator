
Ext.define('BurnChart', {
    extend: 'Ext.Container',
    alias: 'widget.burnchart',
    config: {
        types: [],
        context: undefined,
        filters: []
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
        });
    },
    
    refresh: function(config) {
        Ext.apply(this, config);
        if(this.down('rallychart')) {
            this.down('rallychart').destroy();
        }
        this._showChart();
        this.down('#filterSummary').update(this._getFilterSummaryHtml());
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
                    itemId: 'aggregationField',
                    fieldLabel: 'Burn by:',
                    labelAlign: 'top',
                    labelWidth: 60,
                    displayField: 'displayName',
                    valueField: 'name',
                    editable: false,
                    stateful: true,
                    stateId: this.getContext().getScopedStateId('aggregationField'),
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
                    stateful: true,
                    stateId: this.getContext().getScopedStateId('calculationType'),
                    columns: 1,
                    items: [
                        { boxLabel: 'Sum', name: 'calculationType', inputValue: 'sum' },
                        { boxLabel: 'Count', name: 'calculationType', inputValue: 'count', checked: true}
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
        
       this._showChart();
    },
    
    _getFilterSummaryHtml: function() {
        return Ext.String.format('<ul>{0}</ul>', _.map(this.filters, function(filter) {
            return Ext.String.format('<li>{0}</li>', filter.toString());
        }).join('')) || 'Showing all data';
    },

    _getStoreConfig: function() {
        var storeConfig = {
            find: {
                _TypeHierarchy: { '$in' : _.map(this.model.getArtifactComponentModels(), function(m) {
                    var typeInfo = Rally.util.TypeInfo.getTypeInfoByName(m.typePath);
                    return typeInfo.schemaType || ''; //todo pi's?
                }) },
                Children: null,
                _ProjectHierarchy: this.getContext().getProject().ObjectID,
                _ValidFrom: {
                    //TODO: replace default date filter?
                    '$gt': Rally.util.DateTime.toIsoString(Rally.util.DateTime.add(new Date(), 'day', -30)) 
                }
            },
            fetch: ['PlanEstimate', this.down('#aggregationField').getValue()],
            hydrate: [this.down('#aggregationField').getValue()],
            sort: {
                _ValidFrom: 1
            },
            context: this.getContext().getDataContext(),
            limit: Infinity
        };
        
        if(this.filters.length && this.filters[0].property === 'Feature') {
            var featureRef = this.filters[0].value;
            var featureOid = Rally.util.Ref.getOidFromRef(featureRef);
            delete storeConfig.find._ProjectHierarchy;
            storeConfig.find._ItemHierarchy = featureOid;
            return Rally.data.ModelFactory.getModel({
                type: Rally.util.Ref.getTypeFromRef(featureRef)
            }).then({
                success: function(model) {
                    return model.load(featureOid, {
                        fetch: ['ActualStartDate']
                    }).then({
                        success: function(record) {
                            storeConfig.find._ValidFrom.$gt = Rally.util.DateTime.toIsoString(record.get('ActualStartDate'));
                            return storeConfig;
                        },
                        scope: this
                    });
                },
                scope: this
            });
        } 

        return Deft.Promise.when(storeConfig);
    },

    _getAggregationFieldValues: function() {
        return this.model.getField(this.down('#aggregationField').getValue()).getAllowedValueStore().load();
    },
    
    _showChart: function() {
        Deft.Promise.all([
            this._getStoreConfig(), 
            this._getAggregationFieldValues()]
        ).then({
            success: function(results) {
                var storeConfig = results[0],
                    stateFieldValues = _.invoke(results[1], 'get', 'StringValue');

                this.insert(2, {
                    xtype: 'rallychart',
                    flex: 10,
                    storeType: 'Rally.data.lookback.SnapshotStore',
                    storeConfig: storeConfig,
                    calculatorType: 'BurnCalculator',
                    calculatorConfig: {
                        calculationType: this.down('radiogroup').getValue().calculationType,
                        completedStateNames: ['Accepted', 'Released'], //TODO: configure
                        stateField: this.down('#aggregationField').getValue()
                    },
                    chartConfig: {
                        chart: {
                            zoomType: 'xy'
                        },
                        title: {
                            text: Ext.String.format('{0} Burn Up - {1}', 
                                this.getContext().getProject().Name,
                                _.map(this.types, function(type) {
                                    return Rally.util.TypeInfo.getTypeInfoByName(type).typeName; 
                                }).join(', '))
                        },
                        xAxis: {
                            categories: [],
                            tickmarkPlacement: 'on',
                            tickInterval: 5,
                            title: {
                                text: 'Date',
                                margin: 10
                            }
                        },
                        yAxis: [
                            {
                               title: {
                                    text: this.down('radiogroup').getValue().calculationType === 'count' ? 
                                        'Count' : this.getContext().getWorkspace().WorkspaceConfiguration.IterationEstimateUnitName
                                }
                            }
                        ],
                        tooltip: {
                            formatter: function() {
                                return '' + this.x + '<br />' + this.series.name + ': ' + this.y;
                            }
                        },
                        plotOptions: {
                            series: {
                                marker: {
                                    enabled: false,
                                    states: {
                                        hover: {
                                            enabled: true
                                        }
                                    }
                                },
                                groupPadding: 0.01
                            },
                            column: {
                                stacking: null,
                                shadow: false
                            }
                        }
                    }
                });
            },
            scope: this
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
        return !field.hidden && field.attributeDefinition && 
        field.getType() !== 'collection' && field.hasAllowedValues();
    }
});