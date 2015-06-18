Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    
    launch: function() {
        this._getTypes().then({
            success: this._addControls,
            scope: this
        });
    },
    
    _addControls: function(types) {
        this.add([
            {
                xtype: 'rallycustomfilterbutton',
                context: this.getContext(),
                modelNames: types,
                margin: '10px',
                stateful: true,
                stateId: this.getContext().getScopedStateId('filters'),
                listeners: {
                   customfilter: {
                        fn: this._onFilterButtonStateAvailable,
                        single: true,
                        scope: this
                    }
                },
                toolTipConfig: {
                    html: 'Filter',
                    anchor: 'top',
                    mouseOffset: [-9, -2]
                }
            },
            { xtype: 'container', itemId: 'wi_filter_box', defaults: { margin: 10 }},
            { xtype: 'container', itemId: 'chart_selector_box', defaults: { margin: 10 }, items: [{
                xtype: 'rallycombobox',
                itemId: 'chartType',
                displayField: 'name',
                valueField: 'value',
                editable: false,
                stateful: true,
                stateId: this.getContext().getScopedStateId('chartType'),
                store: Ext.create('Ext.data.Store', {
                    fields: ['name', 'value'],
                    data: [
                        { name: 'Pie', value: 'pie' },
                        { name: 'Bar', value: 'bar' }
                    ]
                }),
                listeners: {
                    select: function(combo, records){
                        this._createChartConfigSection(combo, records);
                    },
                    scope: this
                }
            }]},
            { xtype: 'container', itemId: 'chart_config_box', defaults: {margin: 10}}
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
        var selectedChartType = selectedValue[0].get('name');
        this._createChart(selectedChartType);
    },
    
    _createChart: function(type) {
        var filterButton = this.down('rallycustomfilterbutton');
        this.chart = this.add({
            xtype: type + 'chart',
            types: filterButton.getTypes(),
            filters: filterButton.getFilters(),
            context: this.getContext()
        });  
    },
    
    _showChart: function() {
        var filterButton = this.down('rallycustomfilterbutton');
        this.chart.refresh({
            types: filterButton.getTypes(),
            filters: filterButton.getFilters()
        });
    }
});
