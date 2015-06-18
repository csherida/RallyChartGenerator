Ext.define('PieChartConfig', {
    extend: 'Ext.Container',
    alias: 'widget.piecharconfig',
    config: {
        wiTypes: [],
        context: undefined
    },
    
    initComponent: function() {
        this.callParent(arguments);
        Rally.data.ModelFactory.getModels({
            types: this.wiTypes
        }).then({
            success: this._addControls,
            scope: this
        });
    },
    
    _addControls: function(models) {
        var wiTypes = _.values(models);
        var validFields = this._getValidFields(wiTypes);
        
        this.add([{
            xtype: 'rallycombobox',
            displayField: 'displayName',
            valueField: 'name',
            editable: false,
            store: Ext.create('Ext.data.Store', {
                fields: ['name', 'displayName'],
                data: _.map(validFields, function(field) {
                    return {
                        displayName: Rally.ui.renderer.FieldDisplayNameRenderer.getDisplayName(field),
                        name: field.name
                    };
                })
            })
        }, {
        xtype: 'radiogroup',
        columns: 2,
        items: [
            { boxLabel: 'Sum', name: 'calculationType', inputValue: 'sum' },
            { boxLabel: 'Count', name: 'calculationType', inputValue: 'count', checked: true}
        ]
    }]);
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