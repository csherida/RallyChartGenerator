
Ext.define('PieChart', {
    extend: 'Ext.Container',
    alias: 'widget.piechart',
    config: {
        types: [],
        context: undefined
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
        var chart = this.down('rallychart');
        if(chart) {
            chart.destroy();
        }
        this._showChart();
    },
    
    _addControls: function(models) {
        var wiTypes = _.values(models);
        var validFields = this._getValidFields(wiTypes);
        
        this.add([
            {
                xtype: 'rallycombobox',
                itemId: 'aggregationField',
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
                columns: 2,
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
            }
        ]);
        
       this._showChart();
    },
    
    _showChart: function() {
       this.add({
            xtype: 'rallychart',
            storeType: 'Rally.data.wsapi.artifact.Store',
            storeConfig: {
                models: this.types,
                context: this.getContext().getDataContext(),
                limit: Infinity,
                filters: this.filters
            },
            calculatorType: 'PieCalculator',
            calculatorConfig: {
                calculationType: this.down('radiogroup').getValue().calculationType,
                field: this.down('#aggregationField').getValue()
            },
            chartConfig: {
                chart: { type: 'pie' },
                title: { text: 'Chart' },
                plotOptions: {
                    pie: {
                        minSize: 500,
                        dataLabels: {
                            distance: -30,
                            color: 'white'
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