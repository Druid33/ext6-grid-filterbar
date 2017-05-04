/**
 * Plugin that enable filters on the grid headers.<br>
 * The header filters are integrated with new Ext4 <code>Ext.data.Store</code> filters.<br>
 *
 * @author Ing. Leonardo D'Onofrio (leonardo_donofrio at hotmail.com)
 * @version 1.1 (supports 4.1.1)
 * @updated 2011-10-18 by Ing. Leonardo D'Onofrio (leonardo_donofrio at hotmail.com)
 * Support renderHidden config option, isVisible(), and setVisible() methods (added getFilterBar() method to the grid)
 * Fix filter bug that append filters to Store filters MixedCollection
 * Fix layout broken on initial render when columns have width property
 * @updated 2011-10-24 by Ing. Leonardo D'Onofrio (leonardo_donofrio at hotmail.com)
 * Rendering code rewrited, filters are now rendered inside de column headers, this solves scrollable grids issues, now scroll, columnMove, and columnHide/Show is handled by the headerCt
 * Support showClearButton config option, render a clear Button for each filter to clear the applied filter (uses Ext.ux.form.field.ClearButton plugin)
 * Added clearFilters() method.
 * @updated 2011-10-25 by Ing. Leonardo D'Onofrio (leonardo_donofrio at hotmail.com)
 * Allow preconfigured filter's types and auto based on store field data types
 * Auto generated stores for combo and list filters (local collect or server in autoStoresRemoteProperty response property)
 * @updated 2011-10-26 by Ing. Leonardo D'Onofrio (leonardo_donofrio at hotmail.com)
 * Completelly rewriten to support reconfigure filters on grid's reconfigure
 * Supports clearAll and showHide buttons rendered in an actioncolumn or in new generetad small column
 * @updated 2011-10-27 by Ing. Leonardo D'Onofrio (leonardo_donofrio at hotmail.com)
 * Added support to 4.0.7 (columnresize not fired correctly on this build)
 * @updated 2011-11-02 by Ing. Leonardo D'Onofrio (leonardo_donofrio at hotmail.com)
 * Filter on ENTER
 * Defaults submitFormat on date filter to 'Y-m-d' and use that in applyFilters for local filtering
 * Added null value support on combo and list filters (autoStoresNullValue and autoStoresNullText)
 * Fixed some combo styles
 * @updated 2011-11-10 by Ing. Leonardo D'Onofrio (leonardo_donofrio at hotmail.com)
 * Parse and show initial filters applied to the store (only property -> value filters, filterFn is unsuported)
 * @updated 2011-12-12 by Ing. Leonardo D'Onofrio (leonardo_donofrio at hotmail.com)
 * Extends AbstractPlugin and use Observable as a Mixin
 * Yes/No localization on constructor
 * @updated 2012-01-03 by Ing. Leonardo D'Onofrio (leonardo_donofrio at hotmail.com)
 * Added some support for 4.1 beta
 * @updated 2012-01-05 by Ing. Leonardo D'Onofrio (leonardo_donofrio at hotmail.com)
 * 99% support for 4.1 beta. Seems to be working
 * @updated 2012-03-22 by Ing. Leonardo D'Onofrio (leonardo_donofrio at hotmail.com)
 * Fix focusFirstField method
 * Allow to specify listConfig in combo filter
 * Intercept column's setPadding for all columns except actionColumn or extraColumn (fix checkBoxSelectionModel header)
 * @updated 2012-05-07 by Ing. Leonardo D'Onofrio (leonardo_donofrio at hotmail.com)
 * Fully tested on 4.1 final
 * @updated 2012-05-31 by Ing. Leonardo D'Onofrio (leonardo_donofrio at hotmail.com)
 * Fix padding issue on checkbox column
 * @updated 2012-07-10 by Ing. Leonardo D'Onofrio (leonardo_donofrio at hotmail.com)
 * Add msgTarget: none to field to fix overridding msgTarget to side in fields in 4.1.1
 * @updated 2012-07-26 by Ing. Leonardo D'Onofrio (leonardo_donofrio at hotmail.com)
 * Fixed sort on enter bug regression
 * add checkChangeBuffer: 50 to field, this way works as expected if this config is globally overridden
 * private method applyFilters refactored to support delayed (key events) and instant filters (enter key and combo/picker select event)
 * @updated 2012-07-31 by Ing. Leonardo D'Onofrio (leonardo_donofrio at hotmail.com)
 * Added operator selection in number and date filters
 * @updated by Mgr. Richard Laffers - compatibility with Ext 4.2.1
 * @updated by Ing. Peter Skultety - compatibility with Ext5
 * @updated 2017-01-30 by Ing. Peter Skultety
 *      - move filter configs, stores, fields,... from plugin to grid context (support for more grids with filter rendered at once).
 *      - fixed localized default text in boolean filter
 *      - boolean filter field store si configurable via yesText and noText property
 *      - Filter is also compatible with ext6
*/

Ext.define('GridFilterBar.grid.FilterBar', {
    extend: 'Ext.AbstractPlugin',
    alias: 'plugin.filterbar',
    uses: [
        'Ext.window.MessageBox',
        'GridFilterBar.form.field.ClearButton',
        'GridFilterBar.form.field.OperatorButton',
        'Ext.container.Container',
        'Ext.util.DelayedTask',
        'Ext.layout.container.HBox',
        'Ext.data.ArrayStore',
        'Ext.button.Button',
        'Ext.form.field.Text',
        'Ext.form.field.Number',
        'Ext.form.field.Date',
        'Ext.form.field.ComboBox'
    ],
    mixins: {
        observable: 'Ext.util.Observable'
    },

    updateBuffer                : 800,                  // buffer time to apply filtering when typing/selecting

    columnFilteredCls           : Ext.baseCSSPrefix + 'column-filtered', // CSS class to apply to the filtered column header

    renderHidden                : true,                 // renders the filters hidden by default, use in combination with showShowHideButton
    showShowHideButton          : true,                 // add show/hide button in actioncolumn header if found, if not a new small column is created
    showHideButtonTooltipDo     : 'Show filter bar',    // button tooltip show
    showHideButtonTooltipUndo   : 'Hide filter bar',    // button tooltip hide
    showHideButtonIconCls       : 'filter',             // button iconCls

    showClearButton             : true,                 // use Ext.ux.form.field.ClearButton to allow user to clear each filter, the same as showShowHideButton
    showClearAllButton          : true,                 // add clearAll button in actioncolumn header if found, if not a new small column is created
    clearAllButtonIconCls       : 'clear-filters',      // css class with the icon of the clear all button
    clearAllButtonTooltip       : 'Clear all filters',  // button tooltip

    autoStoresRemoteProperty    : 'autoStores',         // if no store is configured for a combo filter then stores are created automatically, if remoteFilter is true then use this property to return arrayStores from the server
    autoStoresNullValue         : '###NULL###',         // value send to the server to expecify null filter
    autoStoresNullText          : '[empty]',            // NULL Display Text
    autoUpdateAutoStores        : false,                // if set to true combo autoStores are updated each time that a filter is applied

    enableOperators             : true,                 // enable operator selection for number and date filters

    // operator button texts
    textEq: 'Is equal to',
    textNe: 'Is not equal to',
    textGte: 'Great than or equal',
    textLte: 'Less than or equal',
    textGt: 'Great than',
    textLt: 'Less than',

    boolTpl: {
        xtype: 'combo',
        queryMode: 'local',
        forceSelection: true,
        triggerAction: 'all',
        editable: false,
        // store: [
        //     [1, 'Yes'],
        //     [0, 'No']
        // ],
        operator: 'eq'
    },
    dateTpl: {
        xtype: 'datefield',
        editable: true,
        submitFormat: 'Y-m-d',
        operator: 'eq'
    },
    floatTpl: {
        xtype: 'numberfield',
        allowDecimals: true,
        minValue: 0,
        hideTrigger: true,
        keyNavEnabled: false,
        mouseWheelEnabled: false,
        operator: 'eq'
    },
    intTpl: {
        xtype: 'numberfield',
        allowDecimals: false,
        minValue: 0,
        operator: 'eq'
    },
    stringTpl: {
        xtype: 'textfield',
        operator: 'like'
    },
    comboTpl: {
        xtype: 'combo',
        queryMode: 'local',
        forceSelection: true,
        editable: false,
        triggerAction: 'all',
        operator: 'eq'
    },
    listTpl: {
        xtype: 'combo',
        queryMode: 'local',
        forceSelection: true,
        editable: false,
        triggerAction: 'all',
        multiSelect: true,
        operator: 'in'
    },

    constructor: function() {
        var me = this;

        me.mixins.observable.constructor.call(me);
        me.callParent(arguments);
    },

    // private
    init: function(grid) {
        var me = this;

        grid.on({
            columnresize: me.resizeContainer,
            columnhide: me.resizeContainer,
            columnshow: me.resizeContainer,
            beforedestroy: me.unsetup,
            reconfigure: me.resetup,
            scope: grid
        });

        // MIGRATION  It's no longer needed to add events before firing.
        // grid.addEvents('filterupdated');

        Ext.apply(grid, {
            filterBar: me,
            getFilterBar: function() {
                return this.filterBar;
            }
        });

        // me.boolTpl.store[0][1] = Ext.MessageBox.buttonText.yes;
        // me.boolTpl.store[1][1] = Ext.MessageBox.buttonText.no;

        me.setup.call(grid);
    },

    // private
    setup: function() {
        var grid = this,
            plugin = grid.getFilterBar();

        grid._filterBarPluginData = {};

        // configs from plugin, specific for grid and used in grid dcontext are stored in grid context
        grid._filterBarPluginData.updateBuffer = plugin.updateBuffer;
        grid._filterBarPluginData.columnFilteredCls = plugin.columnFilteredCls;
        grid._filterBarPluginData.renderHidden = plugin.renderHidden;
        grid._filterBarPluginData.showShowHideButton = plugin.showShowHideButton;
        grid._filterBarPluginData.showHideButtonTooltipDo = plugin.showHideButtonTooltipDo;
        grid._filterBarPluginData.showHideButtonTooltipUndo = plugin.showHideButtonTooltipUndo;
        grid._filterBarPluginData.showHideButtonIconCls = plugin.showHideButtonIconCls;
        grid._filterBarPluginData.showClearButton = plugin.showClearButton;
        grid._filterBarPluginData.showClearAllButton = plugin.showClearAllButton;
        grid._filterBarPluginData.clearAllButtonIconCls = plugin.clearAllButtonIconCls;
        grid._filterBarPluginData.clearAllButtonTooltip = plugin.clearAllButtonTooltip;
        grid._filterBarPluginData.autoStoresRemoteProperty = plugin.autoStoresRemoteProperty;
        grid._filterBarPluginData.autoStoresNullValue = plugin.autoStoresNullValue;
        grid._filterBarPluginData.autoStoresNullText = plugin.autoStoresNullText;
        grid._filterBarPluginData.autoUpdateAutoStores = plugin.autoUpdateAutoStores;
        grid._filterBarPluginData.enableOperators = plugin.enableOperators;
        grid._filterBarPluginData.textEq = plugin.textEq;
        grid._filterBarPluginData.textNe = plugin.textNe;
        grid._filterBarPluginData.textGte = plugin.textGte;
        grid._filterBarPluginData.textLte = plugin.textLte;
        grid._filterBarPluginData.textGt = plugin.textGt;
        grid._filterBarPluginData.textLt = plugin.textLt;
        grid._filterBarPluginData.boolTpl = plugin.boolTpl;
        grid._filterBarPluginData.dateTpl = plugin.dateTpl;
        grid._filterBarPluginData.floatTpl = plugin.floatTpl;
        grid._filterBarPluginData.intTpl = plugin.intTpl;
        grid._filterBarPluginData.stringTpl = plugin.stringTpl;
        grid._filterBarPluginData.comboTpl = plugin.comboTpl;
        grid._filterBarPluginData.listTpl = plugin.listTpl;


        grid._filterBarPluginData.visible = !plugin.renderHidden;
        grid._filterBarPluginData.autoStores = Ext.create('Ext.util.MixedCollection');
        grid._filterBarPluginData.autoStoresLoaded = false;
        grid._filterBarPluginData.columns = Ext.create('Ext.util.MixedCollection');
        grid._filterBarPluginData.containers = Ext.create('Ext.util.MixedCollection');
        grid._filterBarPluginData.fields = Ext.create('Ext.util.MixedCollection');
        grid._filterBarPluginData.actionColumn = grid.down('actioncolumn') || grid.down('actioncolumnpro');
        grid._filterBarPluginData.extraColumn = null;
        grid._filterBarPluginData.clearAllEl = null;
        grid._filterBarPluginData.showHideEl = null;
        grid._filterBarPluginData.filterArray = [];

        // create task per grid too
        grid._filterBarPluginData.task = Ext.create('Ext.util.DelayedTask');



        // MIGARTION start
        // In Ext5 we cant override proxy method encodeProxy. And we dont need it!
        // me.overrideProxy();
        // MIGRATIN end

        plugin.parseFiltersConfig.call(grid);    // sets me.columns and me.autoStores
        plugin.parseInitialFilters.call(grid);   // sets me.filterArray with the store previous filters if any (adds operator and type if missing)
        plugin.renderExtraColumn.call(grid);     // sets me.extraColumn if applicable

        // renders the filter's bar
        if (grid.rendered) {
            plugin.renderFilterBar.call(grid);
        } else {
            grid.on('afterrender', plugin.renderFilterBar, grid, { single: true });
        }
    },

    // private
    unsetup: function() {
        var grid = this,
            filterData = grid._filterBarPluginData,
            plugin = grid.getFilterBar();

        if (filterData.autoStores.getCount()) {
            grid.store.un('load', plugin.fillAutoStores, grid);
        }

        filterData.autoStores.each(function(item) {
            Ext.destroy(item);
        });

        filterData.autoStores.clear();
        filterData.autoStores = null;
        filterData.columns.each(function(column) {
            if (column.rendered) {
                if(column.getEl().hasCls(filterData.columnFilteredCls)) {
                    column.getEl().removeCls(filterData.columnFilteredCls);
                }
            }
        });

        filterData.columns.clear();
        filterData.columns = null;
        filterData.fields.each(function(item) {
            Ext.destroy(item);
        });

        filterData.fields.clear();
        filterData.fields = null;
        filterData.containers.each(function(item) {
            Ext.destroy(item);
        });

        filterData.containers.clear();
        filterData.containers = null;
        if (filterData.clearAllEl) {
            Ext.destroy(filterData.clearAllEl);
            filterData.clearAllEl = null;
        }

        if (filterData.showHideEl) {
            Ext.destroy(filterData.showHideEl);
            filterData.showHideEl = null;
        }
        if (filterData.extraColumn) {
            grid.headerCt.items.remove(filterData.extraColumn);
            Ext.destroy(filterData.extraColumn);
            filterData.extraColumn = null;
        }

        filterData.task = null;
        filterData.filterArray = null;
    },

    // private
    resetup: function() {
        var grid = this,
            plugin = grid.getFilterBar();

        plugin.unsetup.call(grid);
        plugin.setup.call(grid);
    },

    // private
    overrideProxy: function() {
        var grid = this,
            plugin = grid.getFilterBar();

           Ext.apply(grid.store.proxy, {
            encodeFilters: function(filters) {
                var min = [],
                    length = filters.length,
                    i = 0;

                for (; i < length; i++) {
                    min[i] = {
                        property: filters[i].property,
                        value   : filters[i].value
                    };
                    if (filters[i].type) {
                        min[i].type = filters[i].type;
                    }
                    if (filters[i].operator) {
                        min[i].operator = filters[i].operator;
                    }
                }
                return this.applyEncoding(min);
            }
        });
    },

    // private
    parseFiltersConfig: function() {
        var grid = this,
            filterData = grid._filterBarPluginData,
            plugin = grid.getFilterBar();

        //var columns = this.grid.headerCt.getGridColumns(true);
        // changed by Richard Laffers - the above is incompatible with Ext 4.2.1
        var columns = grid.headerCt.getGridColumns();
        filterData.columns.clear();
        filterData.autoStores.clear();

        Ext.each(columns, function(column) {
            if (column.filter) {
                if (column.filter === true || column.filter === 'auto') { // automatic types configuration (store based)
                    // MIGRATION start
                    // var type = me.grid.store.model.prototype.fields.get(column.dataIndex).type.type;
                    // model.fields.get(..) is incompatible with Ext5.
                    // field.type.type is incompatible with Ext5. We use field.getType().
                    var type;
                    Ext.each(grid.store.model.prototype.fields, function(field) {
                        if (field.name === column.dataIndex) {
                            type = field.getType();
                            return false;
                        }
                    });
                    // MIGARTION end
                    if (type == 'auto') { type = 'string'; }
                    column.filter = type;
                }
                if (Ext.isString(column.filter)) {
                    column.filter = {
                        type: column.filter // only set type to then use templates
                    };
                }
                if (column.filter.type) {
                    column.filter = Ext.applyIf(column.filter, filterData[column.filter.type + 'Tpl']); // also use     templates but with user configuration

                    // create store for boolean filter
                    if (column.filter.type == 'bool' && !column.filter.store) {
                        column.filter.store = [
                            [1, Ext.MessageBox.buttonText.yes],
                            [0, Ext.MessageBox.buttonText.no]
                        ];

                        if (column.filter.yesText) {
                            column.filter.store[0][1] = column.filter.yesText;
                        }

                        if (column.filter.noText) {
                            column.filter.store[1][1] = column.filter.noText;
                        }
                    }
                }

                if (column.filter.xtype == 'combo' && !column.filter.store) {
                    column.autoStore = true;
                    column.filter.store = Ext.create('Ext.data.ArrayStore', {
                        fields: [{
                            name: 'text'
                        },{
                            name: 'id'
                        }]
                    });
                    filterData.autoStores.add(column.dataIndex, column.filter.store);
                    column.filter = Ext.apply(column.filter, {
                        displayField: 'text',
                        valueField: 'id'
                    });
                }

                if (!column.filter.type) {
                    switch(column.filter.xtype) {
                        case 'combo':
                            column.filter.type = (column.filter.multiSelect ? 'list' : 'combo');
                            break;
                        case 'datefield':
                            column.filter.type = 'date';
                            break;
                        case 'numberfield':
                            column.filter.type = (column.filter.allowDecimals ? 'float' : 'int');
                            break;
                        default:
                            column.filter.type = 'string';
                    }
                }

                if (!column.filter.operator) {
                    column.filter.operator = filterData[column.filter.type + 'Tpl'].operator;
                }
                filterData.columns.add(column.dataIndex, column);
            }
        });

        if (filterData.autoStores.getCount()) {
            if (grid.store.getCount() > 0) {
                plugin.fillAutoStores.call(grid);
            }
            if (grid.store.remoteFilter) {
                var autoStores = [];
                filterData.autoStores.eachKey(function(key, item) {
                    autoStores.push(key);
                });
                grid.store.proxy.extraParams = grid.store.proxy.extraParams || {};
                grid.store.proxy.extraParams[filterData.autoStoresRemoteProperty] = autoStores;
            }
            grid.store.on('load', plugin.fillAutoStores, grid);
        }
    },

    // private
    fillAutoStores: function() {
        var grid = this,
            filterData = grid._filterBarPluginData
           ;

        if (!filterData.autoUpdateAutoStores && filterData.autoStoresLoaded) {
            return;
        }

        filterData.autoStores.eachKey(function(key, item) {
            var field,
                data,
                record,
                records,
                fieldValue;

            field = filterData.fields.get(key);
            if (field) {
                field.suspendEvents();
                fieldValue = field.getValue();
            }
            if (!grid.store.remoteFilter) { // values from local store
                data = grid.store.collect(key, true, false).sort();
                records = [];
                Ext.each(data, function(txt) {
                    if (Ext.isEmpty(txt)) {
                        Ext.Array.insert(records, 0, [{
                            text: filterData.autoStoresNullText,
                            id: filterData.autoStoresNullValue
                        }]);
                    } else {
                        records.push({
                            text: txt,
                            id: txt
                        });
                    }
                });
                item.loadData(records);
            } else { // values from server
                if (grid.store.proxy.reader.rawData[filterData.autoStoresRemoteProperty]) {
                    data = grid.store.proxy.reader.rawData[filterData.autoStoresRemoteProperty];
                    if (data[key]) {
                        records = [];
                        Ext.each(data[key].sort(), function(txt) {
                            if (Ext.isEmpty(txt)) {
                                Ext.Array.insert(records, 0, [{
                                    text: filterData.autoStoresNullText,
                                    id: filterData.autoStoresNullValue
                                }]);
                            } else {
                                records.push({
                                    text: txt,
                                    id: txt
                                });
                            }
                        });
                        item.loadData(records);
                    }
                }
            }
            if (field) {
                field.setValue(fieldValue);
                field.resumeEvents();
            }
        });

        filterData.autoStoresLoaded = true;
        if (grid.store.remoteFilter && !filterData.autoUpdateAutoStores) {
            delete grid.store.proxy.extraParams[filterData.autoStoresRemoteProperty];
        }
    },

    // private
    parseInitialFilters: function() {
        var grid = this,
            filterData = grid._filterBarPluginData,
            plugin = grid.getFilterBar()
            ;

        filterData.filterArray = [];
        //11.6.2015 Peter Sliacky
        //tuto podmienku som pridal po migracii z Ext JS 6.0.0.227 na 6.0.0.415, pretoze store.filters bol undifined
        //bolo by teda dobre toto opravit
        if (grid.store.filters) {
            grid.store.filters.each(function(filter) {
                // try to parse initial filters, for now filterFn is unsuported
                if (filter.property && !Ext.isEmpty(filter.value) && filterData.columns.get(filter.property)) {
                    if (!filter.type) {
                        filter.type = filterData.columns.get(filter.property).filter.type;
                    }
                    if (!filter.operator) {
                        filter.operator = filterData.columns.get(filter.property).filter.operator;
                    }
                    filterData.filterArray.push(filter);
                }
            });
        }
    },

    // private
    renderExtraColumn: function() {
        var grid = this,
            plugin = grid.getFilterBar(),
            filterData = grid._filterBarPluginData
            ;

        if (filterData.columns.getCount() && !filterData.actionColumn && (filterData.showClearAllButton || filterData.showShowHideButton)) {
            var extraColumnCssClass = Ext.baseCSSPrefix + 'filter-bar-extra-column-hack';
            if (!document.getElementById(extraColumnCssClass)) {
                var style = document.createElement('style'),
                    css = 'tr.' + Ext.baseCSSPrefix + 'grid-row td.' + extraColumnCssClass + ' { background-color: #ffffff !important; border-color: #ffffff !important; }'
                    ;

                style.setAttribute('type', 'text/css');
                style.setAttribute('id', extraColumnCssClass);
                document.body.appendChild(style);
                if (style.styleSheet) {     // IE
                    style.styleSheet.cssText = css;
                } else {                    // others
                    var cssNode = document.createTextNode(css);
                    style.appendChild(cssNode);
                }
            }
            filterData.extraColumn = Ext.create('Ext.grid.column.Column', {
                draggable: false,
                hideable: false,
                menuDisabled: true,
                sortable: false,
                resizable: false,
                fixed: true,
                width: 28,
                minWidth: 28,
                maxWidth: 28,
                header: '&nbsp;',
                tdCls: extraColumnCssClass,
                // we dont need export this column
                ignoreExport: true
            });
            grid.headerCt.add(filterData.extraColumn);
        }
    },

    // private
    renderFilterBar: function() {
        var grid = this,
            plugin = grid.getFilterBar(),
            filterData = grid._filterBarPluginData
            ;

        filterData.containers.clear();
        filterData.fields.clear();
        filterData.columns.eachKey(function(key, column) {
            var listConfig = column.filter.listConfig || {};
            listConfig = Ext.apply(listConfig, {
                style: 'border-top-width: 1px'
            });
            var plugins = [];
            if (filterData.showClearButton) {
                plugins.push({
                    ptype: 'clearbutton'
                });
            }
            if (filterData.enableOperators && (column.filter.type == 'date' || column.filter.type == 'int' || column.filter.type == 'float')) {
                plugins.push({
                    ptype: 'operatorbutton',
                    listeners: {
                        operatorchanged: function(txt) {
                            if (Ext.isEmpty(txt.getValue())) {
                                return;
                            }
                            plugin.applyInstantFilters.call(grid, txt);
                        }
                    },
                    // texts for the operator button items
                    texteq: filterData.textEq,
                    textne: filterData.textNe,
                    textgte: filterData.textGte,
                    textlte: filterData.textLte,
                    textgt: filterData.textGt,
                    textlt: filterData.textLt
                });
            }
            var field = Ext.widget(column.filter.xtype, Ext.apply(column.filter, {
                dataIndex: key,
                flex: 1,
                margin: 0,
                fieldStyle: 'border-left-width: 0px; border-bottom-width: 0px;',
                listConfig: listConfig,
                preventMark: true,
                msgTarget: 'none',
                checkChangeBuffer: 50,
                enableKeyEvents: true,
                listeners: {
                    change: plugin.applyDelayedFilters,
                    select: plugin.applyInstantFilters,
                    keypress: function(txt, e) {
                        if(e.getCharCode() == 13) {
                            e.stopEvent();
                            plugin.applyInstantFilters.call(grid, txt);
                        }
                        return false;
                    },
                    scope: grid
                },
                plugins: plugins
            }));
            filterData.fields.add(column.dataIndex, field);
            var container = Ext.create('Ext.container.Container', {
                dataIndex: key,
                layout: 'hbox',
                bodyStyle: 'background-color: "transparent";',
                width: column.getWidth(),
                items: [field],
                listeners: {
                    // TODO set scope to grid, or let scope set to default?
                    scope: plugin,
                    element: 'el',
                    mousedown: function(e) { e.stopPropagation(); },
                    click: function(e) { e.stopPropagation(); },
                    dblclick: function(e) { e.stopPropagation(); },
                    keydown: function(e) { e.stopPropagation(); },
                    keypress: function(e) { e.stopPropagation(); },
                    keyup: function(e) { e.stopPropagation(); }
                }
            });
            filterData.containers.add(column.dataIndex, container);
            container.render(Ext.get(column.id));
        });

        var excludedCols = [];
        if (filterData.actionColumn) {
            excludedCols.push(filterData.actionColumn.id);
        }

        if (filterData.extraColumn) {
            excludedCols.push(filterData.extraColumn.id);
        }

        //Ext.each(me.grid.headerCt.getGridColumns(true), function(column) {
        // changed by Richard Laffers - the above is incompatible with Ext 4.2.1
        Ext.each(grid.headerCt.getGridColumns(), function(column) {
            if (!Ext.Array.contains(excludedCols, column.id)) {
                column.setPadding = Ext.Function.createInterceptor(column.setPadding, function(h) {
                    if (column.hasCls(Ext.baseCSSPrefix + 'column-header-checkbox')) { //checkbox column
                        this.titleEl.setStyle({
                            paddingTop: '4px'
                        });
                    }
                    return false;
                });
            }
        });


        plugin.setVisible.call(grid, filterData.visible);

        plugin.renderButtons.call(grid);

        plugin.showInitialFilters.call(grid);
    },

    //private
    renderButtons: function() {
        var grid = this,
            plugin = grid.getFilterBar(),
            filterData = grid._filterBarPluginData,
            column,
            buttonEl
        ;

        if (filterData.showShowHideButton && filterData.columns.getCount()) {
            column = filterData.actionColumn || filterData.extraColumn;
            buttonEl = column.el.first().first();
            filterData.showHideEl = Ext.get(Ext.core.DomHelper.append(buttonEl, {
                tag: 'div',
                style: 'position: absolute; width: 16px; height: 16px; top: 3px; cursor: pointer; left: ' + parseInt((column.el.getWidth() - 16) / 2,10) + 'px',
                cls: filterData.showHideButtonIconCls,
                'data-qtip': (filterData.renderHidden ? filterData.showHideButtonTooltipDo : filterData.showHideButtonTooltipUndo)
            }));
            filterData.showHideEl.on('click', function() {

                plugin.setVisible.call(grid, !filterData.visible);
                filterData.showHideEl.set({
                    'data-qtip': (!filterData.visible ? filterData.showHideButtonTooltipDo : filterData.showHideButtonTooltipUndo)
                });
            });
        }

        if (filterData.showClearAllButton && filterData.columns.getCount()) {
            column = filterData.actionColumn || filterData.extraColumn;
            buttonEl = column.el.first().first();
            filterData.clearAllEl = Ext.get(Ext.core.DomHelper.append(buttonEl, {
                tag: 'div',
                //style: 'position: absolute; width: 16px; height: 16px; top: 25px; cursor: pointer; left: ' + parseInt((column.el.getWidth() - 16) / 2) + 'px',
                style: 'position: absolute; width: 16px; height: 16px; bottom: 2px; cursor: pointer; left: 2px',
                cls: filterData.clearAllButtonIconCls,
                'data-qtip': filterData.clearAllButtonTooltip
            }));

            filterData.clearAllEl.hide();
            filterData.clearAllEl.on('click', function() {
                plugin.clearFilters.call(grid);
            });
        }
    },

    // private
    showInitialFilters: function() {
        var grid = this,
            plugin = grid.getFilterBar(),
            filterData = grid._filterBarPluginData
            ;

        Ext.each(filterData.filterArray, function(filter) {
            var column = filterData.columns.get(filter.property);
            var field = filterData.fields.get(filter.property);
            if(!column.getEl().hasCls(filterData.columnFilteredCls)) {
                column.getEl().addCls(filterData.columnFilteredCls);
            }
            field.suspendEvents();
            field.setValue(filter.value);
            field.resumeEvents();
        });

        if (filterData.filterArray.length && filterData.showClearAllButton) {
            filterData.clearAllEl.show({duration: 1000});
        }
    },

    // private
    resizeContainer: function(headerCt, col) {
        var grid = this,
            plugin = grid.getFilterBar(),
            filterData = grid._filterBarPluginData,
            item,
            itemWidth,
            colWidth,
            dataIndex = col.dataIndex
        ;

        if (!dataIndex) {
            return;
        }

        item = filterData.containers.get(dataIndex);
        if (item && item.rendered) {
            itemWidth = item.getWidth();
            colWidth = filterData.columns.get(dataIndex).getWidth();
            if (itemWidth != colWidth) {
                item.setWidth(filterData.columns.get(dataIndex).getWidth());
                // MIGARTION start
                // doLayout() is deprecated in Ext5
                // item.doLayout();
                item.updateLayout();
                // MIGARTION end
            }
        }
    },

    // private
    applyFilters: function(field) {
        var grid = this,
            plugin = grid.getFilterBar(),
            filterData = grid._filterBarPluginData,
            column,
            newVal,
            myIndex
        ;

        if (!field.isValid()) {
            return;
        }

        column = filterData.columns.get(field.dataIndex);
        newVal = (grid.store.remoteFilter ? field.getSubmitValue() : field.getValue());

        if (Ext.isArray(newVal) && newVal.length === 0) {
            newVal = '';
        }

        myIndex = -1;
        Ext.each(filterData.filterArray, function(item2, index, allItems) {
            // MIGRATION start
            // if(item2.property === column.dataIndex) {
            if(item2.getProperty() === column.dataIndex) {
            // MIGRATION end
                myIndex = index;
            }
        });

        if(myIndex != -1) {
            filterData.filterArray.splice(myIndex, 1);
        }

        if(!Ext.isEmpty(newVal)) {
            if (!grid.store.remoteFilter) {
                var operator = field.operator || column.filter.operator,
                    filterFn;
                switch(operator) {
                    case 'eq':
                        filterFn = function(item) {
                            if (column.filter.type == 'date') {
                                return Ext.Date.clearTime(item.get(column.dataIndex), true).getTime() == Ext.Date.clearTime(newVal, true).getTime();
                            } else {
                                return (Ext.isEmpty(item.get(column.dataIndex)) ? filterData.autoStoresNullValue : item.get(column.dataIndex)) == (Ext.isEmpty(newVal) ? filterData.autoStoresNullValue : newVal);
                            }
                        };
                        break;
                    case 'gte':
                        filterFn = function(item) {
                            if (column.filter.type == 'date') {
                                return Ext.Date.clearTime(item.get(column.dataIndex), true).getTime() >= Ext.Date.clearTime(newVal, true).getTime();
                            } else {
                                return (Ext.isEmpty(item.get(column.dataIndex)) ? filterData.autoStoresNullValue : item.get(column.dataIndex)) >= (Ext.isEmpty(newVal) ? filterData.autoStoresNullValue : newVal);
                            }
                        };
                        break;
                    case 'lte':
                        filterFn = function(item) {
                            if (column.filter.type == 'date') {
                                return Ext.Date.clearTime(item.get(column.dataIndex), true).getTime() <= Ext.Date.clearTime(newVal, true).getTime();
                            } else {
                                return (Ext.isEmpty(item.get(column.dataIndex)) ? filterData.autoStoresNullValue : item.get(column.dataIndex)) <= (Ext.isEmpty(newVal) ? filterData.autoStoresNullValue : newVal);
                            }
                        };
                        break;
                    case 'ne':
                        filterFn = function(item) {
                            if (column.filter.type == 'date') {
                                return Ext.Date.clearTime(item.get(column.dataIndex), true).getTime() != Ext.Date.clearTime(newVal, true).getTime();
                            } else {
                                return (Ext.isEmpty(item.get(column.dataIndex)) ? filterData.autoStoresNullValue : item.get(column.dataIndex)) != (Ext.isEmpty(newVal) ? filterData.autoStoresNullValue : newVal);
                            }
                        };
                        break;
                    case 'like':
                        filterFn = function(item) {
                            var re = new RegExp(newVal, 'i');
                            return re.test(item.get(column.dataIndex));
                        };
                        break;
                    case 'in':
                        filterFn = function(item) {
                            var re = new RegExp('^' + newVal.join('|') + '$', 'i');
                            return re.test((Ext.isEmpty(item.get(column.dataIndex)) ? filterData.autoStoresNullValue : item.get(column.dataIndex)));
                        };
                        break;
                }
                filterData.filterArray.push(Ext.create('Ext.util.Filter', {
                    property: column.dataIndex,
                    filterFn: filterFn
                    // me: me
                }));
            } else {
                filterData.filterArray.push(Ext.create('Ext.util.Filter', {
                    property: column.dataIndex,
                    value: newVal,
                    type: column.filter.type,
                    operator: (field.operator || column.filter.operator)
                }));
            }
            if(!column.getEl().hasCls(filterData.columnFilteredCls)) {
                column.getEl().addCls(filterData.columnFilteredCls);
            }
        } else {
            if(column.getEl().hasCls(filterData.columnFilteredCls)) {
                column.getEl().removeCls(filterData.columnFilteredCls);
            }
        }
        grid.store.currentPage = 1;
        if(filterData.filterArray.length > 0) {
            if (!grid.store.remoteFilter) {
                grid.store.clearFilter();
            }
            if (grid.store.filters) {
                grid.store.filters.clear();
            }
            // MIGRATION start
            // grid.store.filter(me.filterArray);
            grid.store.addFilter(filterData.filterArray);
            // MIGRATION end

            if (filterData.clearAllEl) {
                filterData.clearAllEl.show({duration: 1000});
            }
        } else {
            grid.store.clearFilter();
            if (filterData.clearAllEl) {
                filterData.clearAllEl.hide({duration: 1000});
            }
        }
        if (!grid.store.remoteFilter && filterData.autoUpdateAutoStores) {
            plugin.fillAutoStores.call(grid);
        }
        grid.fireEvent('filterupdated', filterData.filterArray);
    },

    // private
    applyDelayedFilters: function(field) {
        var grid = this,
            filterData = grid._filterBarPluginData,
            plugin = grid.getFilterBar()
        ;

        if (!field.isValid()) {
            return;
        }

        filterData.task.delay(filterData.updateBuffer, plugin.applyFilters, grid, [field]);
    },

    // private
    applyInstantFilters: function(field) {
        var grid = this,
            filterData = grid._filterBarPluginData,
            plugin = grid.getFilterBar()
        ;

        if (!field.isValid()) {
            return;
        }

        filterData.task.delay(0, plugin.applyFilters, grid, [field]);
    },

    //private
    getFirstField: function() {
        var grid = this,
            filterData = grid._filterBarPluginData,
            plugin = grid.getFilterBar(),
            field
        ;

        // changed by Richard Laffers - the above is incompatible with Ext 4.2.1
        //Ext.each(me.grid.headerCt.getGridColumns(true), function(col) {
        Ext.each(grid.headerCt.getGridColumns(), function(col) {
            if (col.filter) {
                field = filterData.fields.get(col.dataIndex);
                return false;
            }
        });

        return field;
    },

    //private
    focusFirstField: function() {
        var grid = this,
            filterData = grid._filterBarPluginData,
            plugin = grid.getFilterBar(),
            field
        ;


        field = plugin.getFirstField.call(grid);

        if (field) {
            field.focus(false, 200);
        }
    },

    clearFilters: function() {
        var grid = this,
            filterData = grid._filterBarPluginData,
            plugin = grid.getFilterBar(),
            column
        ;


        if (filterData.filterArray.length === 0) {
            return;
        }

        filterData.filterArray = [];
        filterData.fields.eachKey(function(key, field) {
            field.suspendEvents();
            field.reset();
            field.resumeEvents();
            column = filterData.columns.get(key);
            if(column.getEl().hasCls(Ext.baseCSSPrefix + 'column-filtered')) {
                column.getEl().removeCls(Ext.baseCSSPrefix + 'column-filtered');
            }
        });

        grid.store.clearFilter();
        if (filterData.clearAllEl) {
            filterData.clearAllEl.hide({duration: 1000});
        }

        grid.fireEvent('filterupdated', filterData.filterArray);
    },

    setVisible: function(visible) {
        var grid = this,
            filterData = grid._filterBarPluginData,
            plugin = grid.getFilterBar()
        ;


        filterData.containers.each(function(item) {
            item.setVisible(visible);
        });

        if (visible) {
            plugin.focusFirstField.call(grid);
        }

        // MIGRATION start
        // doLayout() is deprecated in Ext5
        // me.grid.headerCt.doLayout();
        grid.headerCt.updateLayout();

        // MIGRATION end
        filterData.visible = visible;
    }

});
