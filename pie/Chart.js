
Ext.define('PieChart', {
    extend: 'Ext.Container',
    alias: 'widget.piechart',
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
                    fieldLabel: 'Slice By:',
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
    
    _showChart: function() {
       this.insert(2, {
            xtype: 'rallychart',
            flex: 10,
            storeType: 'Rally.data.wsapi.artifact.Store',
            storeConfig: {
                models: this.types,
                context: this.getContext().getDataContext(),
                limit: Infinity,
                filters: this.filters,
                fetch: ['PlanEstimate', this.down('#aggregationField').getValue()]
            },
            calculatorType: 'PieCalculator',
            calculatorConfig: {
                calculationType: this.down('radiogroup').getValue().calculationType,
                field: this.down('#aggregationField').getValue()
            },
            chartConfig: {
                chart: { type: 'pie' },
                title: { 
                    text: Ext.String.format('{0} - {1}', 
                        this.getContext().getProject().Name,
                        _.map(this.types, function(type) {
                            return Rally.util.TypeInfo.getTypeInfoByName(type).typeName; 
                        }).join(', '))
                },
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