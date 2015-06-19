Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    
    layout: {
        type: 'vbox',
        align: 'stretch'
    },
    
    launch: function() {
        this._getTypes().then({
            success: this._addControls,
            scope: this
        });
    },
    
    _addControls: function(types) {
        this.add([
            {
                xtype: 'container',
                layout: 'hbox',
                height: 30,
                margin: 10,
                items: [{
                    xtype: 'rallycustomfilterbutton',
                    whiteListFields: ['Milestones'],
                    context: this.getContext(),
                    modelNames: types,
                    stateful: true,
                    stateId: this.getContext().getScopedStateId('filters'),
                    listeners: {
                       customfilter: this._onFilterButtonStateAvailable,
                       scope: this
                    },
                    toolTipConfig: {
                        html: 'Filter',
                        anchor: 'top',
                        mouseOffset: [-9, -2]
                    }
                }, 
                {
                    xtype: 'component',
                    flex: 1
                },
                {
                    xtype: 'rallycombobox',
                    itemId: 'chartType',
                    fieldLabel: 'Chart Type:',
                    labelAlign: 'Left',
                    displayField: 'name',
                    valueField: 'value',
                    editable: false,
                    stateful: true,
                    labelWidth: 60,
                    stateId: this.getContext().getScopedStateId('chartType'),
                    store: Ext.create('Ext.data.Store', {
                        fields: ['name', 'value'],
                        data: [
                            { name: 'Pie', value: 'pie' },
                            { name: 'Bar', value: 'bar' },
                            { name: 'Cumulative Flow', value: 'cfd'},
                            { name: 'Burn', value: 'burn'}
                        ]
                    }),
                     applyState: function(state) {
                        //hack alert
                        //this function is necessary to work around a defect in the sdk
                        Rally.ui.combobox.ComboBox.superclass.applyState.call(this, state);
                    },
                    listeners: {
                        select: function(combo, records){
                            this._createChartConfigSection(combo, records);
                        },
                        scope: this
                    }
                }]
            },
            { xtype: 'container', itemId: 'chart_config_box', flex: 1, layout: 'fit'}
        ]);
    },
    
    _getTypes: function() {
         return Ext.create('Rally.data.wsapi.Store', {
            model: 'TypeDefinition',
            sorters: [
                {
                    property: 'Name'
                }
            ],
            fetch: ['DisplayName', 'ElementName', 'TypePath', 'Parent'],
            filters: [
                {
                    property: 'Creatable',
                    value: true
                }
            ],
            remoteSort: false,
            remoteFilter: true
        }).load().then({
            success: function(records) {
                var types = _.filter(records, function(record) {
                    var parent = record.get('Parent'),
                        parentName = parent.ElementName;
                    return _.contains(['Artifact', 'SchedulableArtifact', 'Requirement', 'PortfolioItem'], parentName);
                });
                var displayNames = _.map(types, function(type) { 
                    return type.get('TypePath');
                });
                displayNames.sort();
                return displayNames;
            }
        });
    },
    
    _onFilterButtonStateAvailable: function() {
        this._createChart(this.down('#chartType').getValue());
    },
    
    _createChartConfigSection: function(comboBox, selectedValue) {
        this.down('#chart_config_box').removeAll();
        delete this.chart;
        var selectedChartType = selectedValue[0].get('value');
        this._createChart(selectedChartType);
    },
    
    _createChart: function(type) {
        var filterButton = this.down('rallycustomfilterbutton'),
            config = {
                types: filterButton.getTypes(),
                filters: filterButton.getFilters()
            };
        if(!this.chart) {
            this.down('#chart_config_box').removeAll();
            this.chart = this.down('#chart_config_box').add(Ext.apply({
                xtype: type + 'chart',
                context: this.getContext()
            }, config));  
        } else {
            this.chart.refresh(config);
        }
    }
});
