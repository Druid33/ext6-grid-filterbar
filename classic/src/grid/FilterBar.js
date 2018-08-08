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
 * @updated by Richard Laffers - compatibility with Ext 4.2.1
 * @updated by Ing. Peter Skultety - compatibility with Ext5
 * @updated 2017-01-30 by Ing. Peter Skultety
 *      - move filter configs, stores, fields,... from plugin to grid context (support for more grids with filter rendered at once).
 *      - fixed localized default text in boolean filter
 *      - boolean filter field store si configurable via yesText and noText property
 *      - Filter is also compatible with ext6
 * @updated 2018-08-08 by Darius Bokor
 *      - text filter by default ignore accent characters
 *      - use allowAccent: true config on field filter config to enable filter by accent cahracters
 *          {
                text: 'User name',
                dataIndex: 'userName',
                filter: {
                    type: 'string',
                    allowAccent: true
                }
            },
*/

/* eslint-disable key-spacing */
/* eslint-disable one-var */
Ext.define('Drywall.grid.FilterBar', {
    extend: 'Ext.AbstractPlugin',
    alias: 'plugin.filterbar',
    uses: [
        'Ext.window.MessageBox',
        'Drywall.form.field.ClearButton',
        'Drywall.form.field.OperatorButton',
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
        operator: 'eq',
        cls:'filter-field'
    },
    dateTpl: {
        xtype: 'datefield',
        editable: true,
        submitFormat: 'Y-m-d',
        operator: 'eq',
        cls:'filter-field'
    },
    floatTpl: {
        xtype: 'numberfield',
        allowDecimals: true,
        minValue: 0,
        hideTrigger: true,
        keyNavEnabled: false,
        mouseWheelEnabled: false,
        operator: 'eq',
        cls:'filter-field'
    },
    intTpl: {
        xtype: 'numberfield',
        allowDecimals: false,
        minValue: 0,
        operator: 'eq',
        cls:'filter-field'
    },
    stringTpl: {
        xtype: 'textfield',
        operator: 'like',
        cls:'filter-field'
    },
    comboTpl: {
        xtype: 'combo',
        queryMode: 'local',
        forceSelection: true,
        editable: false,
        triggerAction: 'all',
        operator: 'eq',
        cls:'filter-field'
    },
    listTpl: {
        xtype: 'combo',
        queryMode: 'local',
        forceSelection: true,
        editable: false,
        triggerAction: 'all',
        multiSelect: true,
        operator: 'in',
        cls:'filter-field'
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
                if (column.getEl().hasCls(filterData.columnFilteredCls)) {
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
        var grid = this;
        //plugin = grid.getFilterBar();

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
            plugin = grid.getFilterBar(),
            columns = grid.headerCt.getGridColumns();

        //var columns = this.grid.headerCt.getGridColumns(true);
        // changed by Richard Laffers - the above is incompatible with Ext 4.2.1
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
                    if (type === 'auto') { type = 'string'; }
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
                    if (column.filter.type === 'bool' && !column.filter.store) {
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

                if (column.filter.xtype === 'combo' && !column.filter.store) {
                    column.autoStore = true;
                    column.filter.store = Ext.create('Ext.data.ArrayStore', {
                        fields: [{
                            name: 'text'
                        }, {
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
                    switch (column.filter.xtype) {
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
            filterData = grid._filterBarPluginData;

        if (!filterData.autoUpdateAutoStores && filterData.autoStoresLoaded) {
            return;
        }

        filterData.autoStores.eachKey(function(key, item) {
            var field,
                data,
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
            filterData = grid._filterBarPluginData;

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
            if (filterData.enableOperators && (column.filter.type === 'date' || column.filter.type === 'int' || column.filter.type === 'float')) {
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
                //listeners: {
                    //change: plugin.applyDelayedFilters,
                    //select: plugin.applyInstantFilters,
                    //keypress: function(txt, e) {
                        //if(e.getCharCode() == 13) {
                            //e.stopEvent();
                            //plugin.applyInstantFilters.call(grid, txt);
                        //}
                        //return false;
                    //},
                    //scope: grid
                //},
                plugins: plugins
            }));
            field.on('change', plugin.applyDelayedFilters, grid);
            field.on('select', plugin.applyInstantFilters, grid);
            field.on('keypress', function(txt, e) {
                if (e.getCharCode() === 13) {
                    e.stopEvent();
                    plugin.applyInstantFilters.call(grid, txt);
                }
                return false;
            }, grid);

            if (column.filter.listeners) {
                field.on(column.filter.listeners);
            }

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
                style: 'position: absolute; width: 16px; height: 16px; top: 3px; cursor: pointer; left: ' + parseInt((column.el.getWidth() - 16) / 2, 10) + 'px',
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
            filterData = grid._filterBarPluginData
        ;

        Ext.each(filterData.filterArray, function(filter) {
            var column = filterData.columns.get(filter.property);
            var field = filterData.fields.get(filter.property);
            if (!column.getEl().hasCls(filterData.columnFilteredCls)) {
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
            if (itemWidth !== colWidth) {
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
    removeDiacritics: function removeDiacritics(str) {
        /** @source https://coderwall.com/p/wzpdgq/strip-accents-diacritics-from-a-string-in-javascript */
        var diacriticsMap = {
            A: /[\u0041\u24B6\uFF21\u00C0\u00C1\u00C2\u1EA6\u1EA4\u1EAA\u1EA8\u00C3\u0100\u0102\u1EB0\u1EAE\u1EB4\u1EB2\u0226\u01E0\u00C4\u01DE\u1EA2\u00C5\u01FA\u01CD\u0200\u0202\u1EA0\u1EAC\u1EB6\u1E00\u0104\u023A\u2C6F]/g,
            AA: /[\uA732]/g,
            AE: /[\u00C6\u01FC\u01E2]/g,
            AO: /[\uA734]/g,
            AU: /[\uA736]/g,
            AV: /[\uA738\uA73A]/g,
            AY: /[\uA73C]/g,
            B: /[\u0042\u24B7\uFF22\u1E02\u1E04\u1E06\u0243\u0182\u0181]/g,
            C: /[\u0043\u24B8\uFF23\u0106\u0108\u010A\u010C\u00C7\u1E08\u0187\u023B\uA73E]/g,
            D: /[\u0044\u24B9\uFF24\u1E0A\u010E\u1E0C\u1E10\u1E12\u1E0E\u0110\u018B\u018A\u0189\uA779]/g,
            DZ: /[\u01F1\u01C4]/g,
            Dz: /[\u01F2\u01C5]/g,
            E: /[\u0045\u24BA\uFF25\u00C8\u00C9\u00CA\u1EC0\u1EBE\u1EC4\u1EC2\u1EBC\u0112\u1E14\u1E16\u0114\u0116\u00CB\u1EBA\u011A\u0204\u0206\u1EB8\u1EC6\u0228\u1E1C\u0118\u1E18\u1E1A\u0190\u018E]/g,
            F: /[\u0046\u24BB\uFF26\u1E1E\u0191\uA77B]/g,
            G: /[\u0047\u24BC\uFF27\u01F4\u011C\u1E20\u011E\u0120\u01E6\u0122\u01E4\u0193\uA7A0\uA77D\uA77E]/g,
            H: /[\u0048\u24BD\uFF28\u0124\u1E22\u1E26\u021E\u1E24\u1E28\u1E2A\u0126\u2C67\u2C75\uA78D]/g,
            I: /[\u0049\u24BE\uFF29\u00CC\u00CD\u00CE\u0128\u012A\u012C\u0130\u00CF\u1E2E\u1EC8\u01CF\u0208\u020A\u1ECA\u012E\u1E2C\u0197]/g,
            J: /[\u004A\u24BF\uFF2A\u0134\u0248]/g,
            K: /[\u004B\u24C0\uFF2B\u1E30\u01E8\u1E32\u0136\u1E34\u0198\u2C69\uA740\uA742\uA744\uA7A2]/g,
            L: /[\u004C\u24C1\uFF2C\u013F\u0139\u013D\u1E36\u1E38\u013B\u1E3C\u1E3A\u0141\u023D\u2C62\u2C60\uA748\uA746\uA780]/g,
            LJ: /[\u01C7]/g,
            Lj: /[\u01C8]/g,
            M: /[\u004D\u24C2\uFF2D\u1E3E\u1E40\u1E42\u2C6E\u019C]/g,
            N: /[\u004E\u24C3\uFF2E\u01F8\u0143\u00D1\u1E44\u0147\u1E46\u0145\u1E4A\u1E48\u0220\u019D\uA790\uA7A4]/g,
            NJ: /[\u01CA]/g,
            Nj: /[\u01CB]/g,
            O: /[\u004F\u24C4\uFF2F\u00D2\u00D3\u00D4\u1ED2\u1ED0\u1ED6\u1ED4\u00D5\u1E4C\u022C\u1E4E\u014C\u1E50\u1E52\u014E\u022E\u0230\u00D6\u022A\u1ECE\u0150\u01D1\u020C\u020E\u01A0\u1EDC\u1EDA\u1EE0\u1EDE\u1EE2\u1ECC\u1ED8\u01EA\u01EC\u00D8\u01FE\u0186\u019F\uA74A\uA74C]/g,
            OI: /[\u01A2]/g,
            OO: /[\uA74E]/g,
            OU: /[\u0222]/g,
            P: /[\u0050\u24C5\uFF30\u1E54\u1E56\u01A4\u2C63\uA750\uA752\uA754]/g,
            Q: /[\u0051\u24C6\uFF31\uA756\uA758\u024A]/g,
            R: /[\u0052\u24C7\uFF32\u0154\u1E58\u0158\u0210\u0212\u1E5A\u1E5C\u0156\u1E5E\u024C\u2C64\uA75A\uA7A6\uA782]/g,
            S: /[\u0053\u24C8\uFF33\u1E9E\u015A\u1E64\u015C\u1E60\u0160\u1E66\u1E62\u1E68\u0218\u015E\u2C7E\uA7A8\uA784]/g,
            T: /[\u0054\u24C9\uFF34\u1E6A\u0164\u1E6C\u021A\u0162\u1E70\u1E6E\u0166\u01AC\u01AE\u023E\uA786]/g,
            TZ: /[\uA728]/g,
            U: /[\u0055\u24CA\uFF35\u00D9\u00DA\u00DB\u0168\u1E78\u016A\u1E7A\u016C\u00DC\u01DB\u01D7\u01D5\u01D9\u1EE6\u016E\u0170\u01D3\u0214\u0216\u01AF\u1EEA\u1EE8\u1EEE\u1EEC\u1EF0\u1EE4\u1E72\u0172\u1E76\u1E74\u0244]/g,
            V: /[\u0056\u24CB\uFF36\u1E7C\u1E7E\u01B2\uA75E\u0245]/g,
            VY: /[\uA760]/g,
            W: /[\u0057\u24CC\uFF37\u1E80\u1E82\u0174\u1E86\u1E84\u1E88\u2C72]/g,
            X: /[\u0058\u24CD\uFF38\u1E8A\u1E8C]/g,
            Y: /[\u0059\u24CE\uFF39\u1EF2\u00DD\u0176\u1EF8\u0232\u1E8E\u0178\u1EF6\u1EF4\u01B3\u024E\u1EFE]/g,
            Z: /[\u005A\u24CF\uFF3A\u0179\u1E90\u017B\u017D\u1E92\u1E94\u01B5\u0224\u2C7F\u2C6B\uA762]/g,
            a: /[\u0061\u24D0\uFF41\u1E9A\u00E0\u00E1\u00E2\u1EA7\u1EA5\u1EAB\u1EA9\u00E3\u0101\u0103\u1EB1\u1EAF\u1EB5\u1EB3\u0227\u01E1\u00E4\u01DF\u1EA3\u00E5\u01FB\u01CE\u0201\u0203\u1EA1\u1EAD\u1EB7\u1E01\u0105\u2C65\u0250]/g,
            aa: /[\uA733]/g,
            ae: /[\u00E6\u01FD\u01E3]/g,
            ao: /[\uA735]/g,
            au: /[\uA737]/g,
            av: /[\uA739\uA73B]/g,
            ay: /[\uA73D]/g,
            b: /[\u0062\u24D1\uFF42\u1E03\u1E05\u1E07\u0180\u0183\u0253]/g,
            c: /[\u0063\u24D2\uFF43\u0107\u0109\u010B\u010D\u00E7\u1E09\u0188\u023C\uA73F\u2184]/g,
            d: /[\u0064\u24D3\uFF44\u1E0B\u010F\u1E0D\u1E11\u1E13\u1E0F\u0111\u018C\u0256\u0257\uA77A]/g,
            dz: /[\u01F3\u01C6]/g,
            e: /[\u0065\u24D4\uFF45\u00E8\u00E9\u00EA\u1EC1\u1EBF\u1EC5\u1EC3\u1EBD\u0113\u1E15\u1E17\u0115\u0117\u00EB\u1EBB\u011B\u0205\u0207\u1EB9\u1EC7\u0229\u1E1D\u0119\u1E19\u1E1B\u0247\u025B\u01DD]/g,
            f: /[\u0066\u24D5\uFF46\u1E1F\u0192\uA77C]/g,
            g: /[\u0067\u24D6\uFF47\u01F5\u011D\u1E21\u011F\u0121\u01E7\u0123\u01E5\u0260\uA7A1\u1D79\uA77F]/g,
            h: /[\u0068\u24D7\uFF48\u0125\u1E23\u1E27\u021F\u1E25\u1E29\u1E2B\u1E96\u0127\u2C68\u2C76\u0265]/g,
            hv: /[\u0195]/g,
            i: /[\u0069\u24D8\uFF49\u00EC\u00ED\u00EE\u0129\u012B\u012D\u00EF\u1E2F\u1EC9\u01D0\u0209\u020B\u1ECB\u012F\u1E2D\u0268\u0131]/g,
            j: /[\u006A\u24D9\uFF4A\u0135\u01F0\u0249]/g,
            k: /[\u006B\u24DA\uFF4B\u1E31\u01E9\u1E33\u0137\u1E35\u0199\u2C6A\uA741\uA743\uA745\uA7A3]/g,
            l: /[\u006C\u24DB\uFF4C\u0140\u013A\u013E\u1E37\u1E39\u013C\u1E3D\u1E3B\u017F\u0142\u019A\u026B\u2C61\uA749\uA781\uA747]/g,
            lj: /[\u01C9]/g,
            m: /[\u006D\u24DC\uFF4D\u1E3F\u1E41\u1E43\u0271\u026F]/g,
            n: /[\u006E\u24DD\uFF4E\u01F9\u0144\u00F1\u1E45\u0148\u1E47\u0146\u1E4B\u1E49\u019E\u0272\u0149\uA791\uA7A5]/g,
            nj: /[\u01CC]/g,
            o: /[\u006F\u24DE\uFF4F\u00F2\u00F3\u00F4\u1ED3\u1ED1\u1ED7\u1ED5\u00F5\u1E4D\u022D\u1E4F\u014D\u1E51\u1E53\u014F\u022F\u0231\u00F6\u022B\u1ECF\u0151\u01D2\u020D\u020F\u01A1\u1EDD\u1EDB\u1EE1\u1EDF\u1EE3\u1ECD\u1ED9\u01EB\u01ED\u00F8\u01FF\u0254\uA74B\uA74D\u0275]/g,
            oi: /[\u01A3]/g,
            ou: /[\u0223]/g,
            oo: /[\uA74F]/g,
            p: /[\u0070\u24DF\uFF50\u1E55\u1E57\u01A5\u1D7D\uA751\uA753\uA755]/g,
            q: /[\u0071\u24E0\uFF51\u024B\uA757\uA759]/g,
            r: /[\u0072\u24E1\uFF52\u0155\u1E59\u0159\u0211\u0213\u1E5B\u1E5D\u0157\u1E5F\u024D\u027D\uA75B\uA7A7\uA783]/g,
            s: /[\u0073\u24E2\uFF53\u015B\u1E65\u015D\u1E61\u0161\u1E67\u1E63\u1E69\u0219\u015F\u023F\uA7A9\uA785\u1E9B]/g,
            ss: /[\u00DF]/g,
            t: /[\u0074\u24E3\uFF54\u1E6B\u1E97\u0165\u1E6D\u021B\u0163\u1E71\u1E6F\u0167\u01AD\u0288\u2C66\uA787]/g,
            tz: /[\uA729]/g,
            u: /[\u0075\u24E4\uFF55\u00F9\u00FA\u00FB\u0169\u1E79\u016B\u1E7B\u016D\u00FC\u01DC\u01D8\u01D6\u01DA\u1EE7\u016F\u0171\u01D4\u0215\u0217\u01B0\u1EEB\u1EE9\u1EEF\u1EED\u1EF1\u1EE5\u1E73\u0173\u1E77\u1E75\u0289]/g,
            v: /[\u0076\u24E5\uFF56\u1E7D\u1E7F\u028B\uA75F\u028C]/g,
            vy: /[\uA761]/g,
            w: /[\u0077\u24E6\uFF57\u1E81\u1E83\u0175\u1E87\u1E85\u1E98\u1E89\u2C73]/g,
            x: /[\u0078\u24E7\uFF58\u1E8B\u1E8D]/g,
            y: /[\u0079\u24E8\uFF59\u1EF3\u00FD\u0177\u1EF9\u0233\u1E8F\u00FF\u1EF7\u1E99\u1EF5\u01B4\u024F\u1EFF]/g,
            z: /[\u007A\u24E9\uFF5A\u017A\u1E91\u017C\u017E\u1E93\u1E95\u01B6\u0225\u0240\u2C6C\uA763]/g
        };
        for (var x in diacriticsMap) {
            str = str.replace(diacriticsMap[x], x);
        }
        return str;
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
        if (column.filter.type === 'bool') {
            newVal = !!newVal;
        }

        if (Ext.isArray(newVal) && newVal.length === 0) {
            newVal = '';
        }

        myIndex = -1;
        Ext.each(filterData.filterArray, function(item2, index, allItems) {
            // MIGRATION start
            // if(item2.property === column.dataIndex) {
            if (item2.getProperty() === column.dataIndex) {
            // MIGRATION end
                myIndex = index;
            }
        });

        if (myIndex !== -1) {
            filterData.filterArray.splice(myIndex, 1);
        }

        if (!Ext.isEmpty(newVal)) {
            if (!grid.store.remoteFilter) {
                var operator = field.operator || column.filter.operator,
                    filterFn;
                switch (operator) {
                    case 'eq':
                        filterFn = function(item) {
                            if (column.filter.type === 'date') {
                                // Because of getTime() error on null need to check empty values
                                return (item.get(column.dataIndex) === null) ? false : Ext.Date.clearTime(item.get(column.dataIndex), true).getTime() === Ext.Date.clearTime(newVal, true).getTime();
                            } else {
                                return (Ext.isEmpty(item.get(column.dataIndex)) ? filterData.autoStoresNullValue : item.get(column.dataIndex)) === (Ext.isEmpty(newVal) ? filterData.autoStoresNullValue : newVal);
                            }
                        };
                        break;
                    case 'gte':
                        filterFn = function(item) {
                            if (column.filter.type === 'date') {
                                // Because of getTime() error on null need to check empty values
                                return (item.get(column.dataIndex) === null) ? false : Ext.Date.clearTime(item.get(column.dataIndex), true).getTime() >= Ext.Date.clearTime(newVal, true).getTime();
                            } else {
                                return (Ext.isEmpty(item.get(column.dataIndex)) ? filterData.autoStoresNullValue : item.get(column.dataIndex)) >= (Ext.isEmpty(newVal) ? filterData.autoStoresNullValue : newVal);
                            }
                        };
                        break;
                    case 'lte':
                        filterFn = function(item) {
                            if (column.filter.type === 'date') {
                                // Because of getTime() error on null need to check empty values
                                return (item.get(column.dataIndex) === null) ? true : Ext.Date.clearTime(item.get(column.dataIndex), true).getTime() <= Ext.Date.clearTime(newVal, true).getTime();
                            } else {
                                return (Ext.isEmpty(item.get(column.dataIndex)) ? filterData.autoStoresNullValue : item.get(column.dataIndex)) <= (Ext.isEmpty(newVal) ? filterData.autoStoresNullValue : newVal);
                            }
                        };
                        break;
                    case 'ne':
                        filterFn = function(item) {
                            if (column.filter.type === 'date') {
                                // Because of getTime() error on null need to check empty values
                                return (item.get(column.dataIndex) === null) ? true : Ext.Date.clearTime(item.get(column.dataIndex), true).getTime() !== Ext.Date.clearTime(newVal, true).getTime();
                            } else {
                                return (Ext.isEmpty(item.get(column.dataIndex)) ? filterData.autoStoresNullValue : item.get(column.dataIndex)) !== (Ext.isEmpty(newVal) ? filterData.autoStoresNullValue : newVal);
                            }
                        };
                        break;
                    case 'like':
                        filterFn = function(item) {
                            var itemValue = item.get(column.dataIndex),
                                val = newVal;
                            if (!column.filter.hasOwnProperty('allowAccent') ||
                                column.filter.allowAccent !== true) {
                                val = plugin.removeDiacritics(val);
                                itemValue = plugin.removeDiacritics(itemValue);
                            }
                            var re = new RegExp(val, 'i');
                            return re.test(itemValue);
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
            if (!column.getEl().hasCls(filterData.columnFilteredCls)) {
                column.getEl().addCls(filterData.columnFilteredCls);
            }
        } else {
            if (column.getEl().hasCls(filterData.columnFilteredCls)) {
                column.getEl().removeCls(filterData.columnFilteredCls);
            }
        }
        grid.store.currentPage = 1;
        if (filterData.filterArray.length > 0) {
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
    applyDelayedFilters: function(field, newValue, oldValue) {
        var grid = this,
            filterData = grid._filterBarPluginData,
            plugin = grid.getFilterBar()
            ;

        if (!field.isValid()) {
            return;
        }

        filterData.task.delay(filterData.updateBuffer, plugin.applyFilters, grid, [field]);
        if (newValue === null || newValue === '') {
            grid.fireEvent('filtercleared', field);
        }
    },

    // private
    applyInstantFilters: function(field, newValue, oldValue) {
        var grid = this,
            filterData = grid._filterBarPluginData,
            plugin = grid.getFilterBar()
            ;

        if (!field.isValid()) {
            return;
        }

        filterData.task.delay(0, plugin.applyFilters, grid, [field]);
        if (newValue === null || newValue === '') {
            grid.fireEvent('filtercleared', field);
        }
    },

    //private
    getFirstField: function() {
        var grid = this,
            filterData = grid._filterBarPluginData,
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
            if (column.getEl().hasCls(Ext.baseCSSPrefix + 'column-filtered')) {
                column.getEl().removeCls(Ext.baseCSSPrefix + 'column-filtered');
            }
        });

        grid.store.clearFilter();
        if (filterData.clearAllEl) {
            filterData.clearAllEl.hide({duration: 1000});
        }

        grid.fireEvent('filterupdated', filterData.filterArray);
        grid.fireEvent('filtercleared', null);
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
