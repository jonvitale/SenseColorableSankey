/**
*	Jonathan Vitale
*   Major code changes from Xavier Le Pitre's version 2.31
*
* 	v0.4.2: A qHeight of 10,000 doesn't work - too many cells. Reducing to 1000
*	v0.4.1: terminal nodes no longer pushed to edge of display
*	v0.4:
*		- if data is very large will incrementally grow data (using backend api to grow hypercube in callback paint functions).
*		- Make show null nodes default setting so users can see all of data, selection box is in Node Options
*		- Also in Node Options, allow users to hide nodes with a given text, e.g., "Not Yet", separate multiple by ";"
*		- Finally, in Node Options, allow users to select minimum size of a null
*		- Similarly, in Link Options, allow users to hide links with < minimum size
*
*	v0.3:
*		- updated flow coloring to be dimension based. We now calculate the outflow for each dimension. Will ignore the final dimension
*		- ignores null dimensions - skips over them. Good for data that will be loaded in the future.
*		- should export to image and pdf
*		- Label dimensions on Sankey
*	v0.2:
*		- You can now sort each dimension by expression. Simply assign a numeric value to the dimension value
*			and then you can sort on and switch whether you are ascending or descending
*		- slightly smarter checking for pictures on measures (but still not really tested)
*	v0.1: 
*		- In the definition of dimensions, we now include options for coloring. Users first have the option of "auto" coloring.
*			The auto color is random (not persistent). If auto is switched off a drop-down with several options appears, including
*			random, single color, and expression. For random, persistence means that a node will always
*			have the same color based upon its text and position. For expression, you can use the dimension names, like
*				If(D1 = 10, '#FF0000', '#00000'). Set different expressions for each dimension.
*		- The Sankey Settings area of the panel, now separates Flow Options (e.g. max flow) and Flow Colors. The flow colors
*			works in the same way as the dimensions, but creates a new measure. Use expressions like the following to color
*				If(D1 = 10 and D2 = 20, '#FF0000', '#00000')
*		- Turned on the exporting option.
**/

// Is this necessary? It was in the original.
/*
requirejs.config({
  shim : {
	"extensions/SenseColorableSankey/sankeymore" : {
	  deps : ["extensions/SenseColorableSankey/d3.min"],
	  exports: 'd3.sankey'
	}
  }
});
*/
define(
	[
	"jquery", 
	"js/qlik",
	"text!./style.css",
	"text!themes/old/sense/theme.json",
	"./md5.min",
	"./d3.min",
	"./colorsankeymore"	
	],
		
	function($, qlik, cssContent, Theme, md5) {
		
		'use strict';
		Theme = JSON.parse(Theme);
		var SenseColorableSankeyVersion = "0.4.2";
		var runningTick = 1;

		$( "<style>" ).html( cssContent ).appendTo( "head" );
		return {
			initialProperties: {
				version: SenseColorableSankeyVersion,
				qHyperCubeDef: {
					qDimensions: [],
					qMeasures: [],
					qInitialDataFetch: [{
						qWidth: 10,
						qHeight: 1000
					}]
				}
				, selectionMode: "QUICK"
			},
			definition: {
				type: "items",
				component: "accordion",
				items: {
					dimensions: {
						uses: "dimensions",
						min: 2,
						max: 6,
						items: {
							colorSectionText:{
								type:"string",
								component:"text",
								label:" "
							},
							colorSwitch:{
								type: "boolean",
								component: "switch",
								label: "Colors",
								ref:"qDef.myColorSelection.auto",
								options: [
									{
                                    	value: true,
                                    	label: "Auto"
                                	}, {
                                    	value: false,
                                        label: "Custom"
                                    }
                                ], 
                                defaultValue: true
							},
							colorChoice:{
								type:"string",
								component:"dropdown",
								label:"",
								ref:"qDef.myColorSelection.choice",
								options: [
									{label: "Random", value:"random"},
									{label: "Single color", value:"single"},
									{label: "By expression", value:"expression"}
								],
								show : function(layout) {
									if (typeof layout === 'object'){
										if (typeof layout.qDef.myColorSelection === 'object' && typeof layout.qDef.myColorSelection.auto !== 'undefined'){
											return !layout.qDef.myColorSelection.auto;
										} else { 
											return false;
										}
									} else {
										return false;
									}
								}	
							},
							// the following two objects are moved from the "Sankey Settings" section to here.
							colorPalette:{
								type:"string",
								component: "dropdown",
								label : "Palette",
								ref:"qDef.myColorSelection.displayPalette",
								options:
								[
									{
										value: "D3-20",
										label: "Ordinal Palette 20 colors"
									},
									{
										value: "D3-20c",
										label: "Blue-Grey Palette 20 colors"
									},
									{
										value: "D3-20b",
										label: "Blue-Purple Palette 20 colors"
									},
									{
										value: "20",
										label: "Palette 20 colors"
									},
									{
										value: "20a",
										label: "Other Palette 20 colors"
									}
								],
								defaultValue: "D3-20",
								show : function(layout) {
									if (typeof layout === 'object'){
										if (typeof layout.qDef.myColorSelection === 'object' && typeof layout.qDef.myColorSelection.choice !== 'undefined'){
											return !layout.qDef.myColorSelection.auto && layout.qDef.myColorSelection.choice === 'random';
										} else { 
											return false;
										}
									} else {
										return false;
									}
								}
							},
							colorPersistence:{
								ref: "qDef.myColorSelection.colorPersistence",
								component: "switch",
								type: "boolean",
								translation: "Persistence",
								defaultValue: false,
								trueOption: {
								  value: true,
								  translation: "properties.on"
								},
								falseOption: {
								  value: false,
								  translation: "properties.off"
								},
								show : function(layout) {
									if (typeof layout === 'object'){
										if (typeof layout.qDef.myColorSelection === 'object' && typeof layout.qDef.myColorSelection.choice !== 'undefined'){
											return !layout.qDef.myColorSelection.auto && layout.qDef.myColorSelection.choice === 'random';
										} else { 
											return false;
										}
									} else {
										return false;
									}
								}
							},
							colorSingle:{
								type: "integer",
								component: "color-picker",
								label: "Color",
								ref: "qDef.myColorSelection.single",
								dualOutput: true,
								defaultValue: 1,
								show : function(layout) {
									if (typeof layout === 'object'){
										if (typeof layout.qDef.myColorSelection === 'object' && typeof layout.qDef.myColorSelection.choice !== 'undefined'){
											return !layout.qDef.myColorSelection.auto && layout.qDef.myColorSelection.choice === 'single';
										} else { 
											return false;
										}
									} else {
										return false;
									}
								}
							},
							colorExpression:{
								type: "string",
								label: "Enter color expression",
								ref: "qAttributeExpressions.0.qExpression",
								component: "expression",
								show : function(layout) {
									if (typeof layout === 'object'){
										if (typeof layout.qDef.myColorSelection === 'object' && typeof layout.qDef.myColorSelection.choice !== 'undefined'){
											return !layout.qDef.myColorSelection.auto && layout.qDef.myColorSelection.choice === 'expression';
										} else { 
											return false;
										}
									} else {
										return false;
									}
								}
							},
							// JV Update v0.3: make flow color part of the dimension
							flowColorSectionText:{
								type:"string",
								component:"text",
								label:" "
							},
							flowColorSwitch:{
								type: "boolean",
								component: "switch",
								label: "Outflow Colors",
								ref:"qDef.myFlowColorSelection.auto",
								options: [
									{
                                    	value: true,
                                    	label: "Auto"
                                	}, {
                                    	value: false,
                                        label: "Custom"
                                    }
                                ]
                                ,defaultValue: true
							},
							flowColorChoice:{
								type:"string",
								component:"dropdown",
								label:"Choose an outflow color method",
								ref:"qDef.myFlowColorSelection.choice",
								options: [
									{label: "Random", value:"random"},
									{label: "Single color", value:"single"},
									{label: "By expression", value:"expression"}
								],
								show : function(layout) {
									if (typeof layout === 'object'){
										if (typeof layout.qDef.myFlowColorSelection === 'object' && typeof layout.qDef.myFlowColorSelection.auto !== 'undefined'){
											return !layout.qDef.myFlowColorSelection.auto;
										} else { 
											return false;
										}
									} else {
										return false;
									} return
								}	
							},
							// the following two objects are moved from the "Sankey Settings" section to here.
							flowColorPalette:{
								type:"string",
								component: "dropdown",
								label : "Outflow Palette",
								ref:"qDef.myFlowColorSelection.displayPalette",
								options:
								[
									{
										value: "D3-20",
										label: "Ordinal Palette 20 colors"
									},
									{
										value: "D3-20c",
										label: "Blue-Grey Palette 20 colors"
									},
									{
										value: "D3-20b",
										label: "Blue-Purple Palette 20 colors"
									},
									{
										value: "20",
										label: "Palette 20 colors"
									},
									{
										value: "20a",
										label: "Other Palette 20 colors"
									},
								],
								defaultValue: "D3-20",
								show : function(layout) {
									if (typeof layout === 'object'){
										if (typeof layout.qDef.myFlowColorSelection === 'object' && typeof layout.qDef.myFlowColorSelection.choice !== 'undefined'){
											return !layout.qDef.myFlowColorSelection.auto && layout.qDef.myFlowColorSelection.choice === 'random';
										} else { 
											return false;
										}
									} else {
										return false;
									} return
								}
							},
							flowColorPersistence:{
								component: "switch",
								type: "boolean",
								translation: "Persistence",
								ref: "qDef.myFlowColorSelection.colorPersistence",
								defaultValue: false,
								trueOption: {
								  value: true,
								  translation: "properties.on"
								},
								falseOption: {
								  value: false,
								  translation: "properties.off"
								},
								show : function(layout) {
									if (typeof layout === 'object'){
										if (typeof layout.qDef.myFlowColorSelection === 'object' && typeof layout.qDef.myFlowColorSelection.choice !== 'undefined'){
											return !layout.qDef.myFlowColorSelection.auto && layout.qDef.myFlowColorSelection.choice === 'random';
										} else { 
											return false;
										}
									} else {
										return false;
									} return
								}
							},
							flowColorSingle:{
								type: "integer",
								component: "color-picker",
								label: "Outflow Color",
								ref: "qDef.myFlowColorSelection.single",
								dualOutput: true,
								defaultValue: 1,
								show : function(layout) {
									if (typeof layout === 'object'){
										if (typeof layout.qDef.myFlowColorSelection === 'object' && typeof layout.qDef.myFlowColorSelection.choice !== 'undefined'){
											return !layout.qDef.myFlowColorSelection.auto && layout.qDef.myFlowColorSelection.choice === 'single';
										} else { 
											return false;
										}
									} else {
										return false;
									} return
								}
							},
							flowColorExpression:{
								type: "string",
								label: "Enter outflow color expression",
								ref: "qAttributeExpressions.1.qExpression",
								component: "expression",
								show : function(layout) {
									if (typeof layout === 'object'){
										if (typeof layout.qDef.myFlowColorSelection === 'object' && typeof layout.qDef.myFlowColorSelection.choice !== 'undefined'){
											return !layout.qDef.myFlowColorSelection.auto && layout.qDef.myFlowColorSelection.choice === 'expression';
										} else { 
											return false;
										}
									} else {
										return false;
									}
								}
							},
							sortSectionText:{
								type:"string",
								component:"text",
								label:" "
							},
							sortSwitch:{
								type: "boolean",
								component: "switch",
								label: "Sort",
								ref:"qDef.mySortSelection.auto",
								options: [
									{
                                    	value: true,
                                    	label: "Auto"
                                	}, {
                                    	value: false,
                                        label: "Expression"
                                    }
                                ], 
                                defaultValue: true
							},

							sortExpression:{
								type: "string",
								label: "Enter sorting expression",
								ref: "qAttributeExpressions.2.qExpression",
								component: "expression",
								show : function(layout) {
									if (typeof layout === 'object'){
										if (typeof layout.qDef.mySortSelection === 'object' && typeof layout.qDef.mySortSelection.auto !== 'undefined'){
											return !layout.qDef.mySortSelection.auto;
										} else { 
											return false;
										}
									} else {
										return false;
									}
								}
							},
							sortAscending:{
								type: "boolean",
								component: "switch",
								label: "Sort Direction",
								ref:"qDef.mySortSelection.ascending",
								options: [
									{
                                    	value: true,
                                    	label: "Ascending"
                                	}, {
                                    	value: false,
                                        label: "Descending"
                                    }
                                ], 
                                defaultValue: true,
                                show : function(layout) {
									if (typeof layout === 'object'){
										if (typeof layout.qDef.mySortSelection === 'object' && typeof layout.qDef.mySortSelection.auto !== 'undefined'){
											return !layout.qDef.mySortSelection.auto;
										} else { 
											return false;
										}
									} else {
										return false;
									}
								}
							}
						}				
					},
					measures: {
						uses: "measures",
						min: 1,
						max: 4
					},
								
					SankeyGroup: {
						label: "Sankey Settings",
						component:"expandable-items",
						items : {
							NodeOpts: {
								label: "Node Options",
								type: "items",
								items : {
									sortSwitch:{
										type: "boolean",
										component: "switch",
										label: "Show dimension labels",
										ref:"displayDimensionLabels",
										options: [
											{
		                                    	value: true,
		                                    	label: "Show"
		                                	}, {
		                                    	value: false,
		                                        label: "Hide"
		                                    }
		                                ], 
		                                defaultValue: false
									}, 
									nodeMin:{
										type: "integer",
										label: "Minimum Node Size",
										ref: "nodeMinSize",
										defaultValue: 1,
										min : 1,
										max : 200000
									},
									removeNullNodes:{
										type:"boolean",
										label:"Remove Empty Nodes",
										ref:"nodeRemoveEmpty",
										defaultValue: false
									},
									removeTextNodes:{
										type:"string",
										expression:"",
										label:"Remove with text (separate by ;)",
										ref:"nodeRemoveText"
									}
								}
							}, 
							FlowOps: {
								label : "Flow Options",
								type:"items",
								items : {

									limitFlow:{
										ref: "limitFlow",
										type: "boolean",
										label: "Limit path combinations?",
										default: true
										
									},
									flowMax:{
										type: "integer",
										label: "# of unique path combos",
										ref: "flowMax",
										defaultValue: 1000,
										min : 1, 
										show: function(layout)  { if( layout.limitFlow ){ return true } else { return false } }
									},
									nodeMin:{
										type: "integer",
										label: "Minimum Link Size",
										ref: "linkMinSize",
										defaultValue: 1,
										min : 1,
										max : 200000
									},									
									Separateur:{
										ref: "displaySeparateur",
										type: "string",
										component: "dropdown",
										label: "Pop-up Separator",
										options:
										[
											{
											value:" - ",
											label:"-"
											},
											{
											value:" <-> ",
											label:"<->"
											},
											{
											value: " → ",
											label: " → "
											},
										],
										defaultValue: " - "
									},
									Format:{
										ref: "displayFormat",
										type: "string",
										component: "dropdown",
										label: "Pop-up Format",
										options: 
										[ 
											{
											value: "Number2",
											label: "1000.12"
											},
											{
											value: "Number1",
											label: "1000.1"
											},
											{
											value: "Number",
											label: "1000"
											},
										],
										defaultValue: "Number"
									},
									currencySymbol:{
										type: "string",
										label: "Currency Symbol",
										ref: "currencySymbol",
										defaultValue: "€"
									}

								},
							},							
							manageImages: {
								type:"items",
								label:"Images (beta)",
													
								items: {	
									useImage: {
										ref: "useImage",
										type: "boolean",
										label : "Display Image for 1st and last Dimension",
										defaultValue: false,
									},
									useMeasure : {
										ref: "useMeasure",
										type: "boolean",
										component: "buttongroup",
										label: "Dimension or Measure",
										options: [
										{
											value: false,
											label: "Dimensions",
											tooltip: "1st and last dimensions will be used to build the image"
										},
										{
											value: true,
											label: "Measures",
											tooltip: "Last and 2nd to last Measures contain the image"
										}],
										defaultValue: true,
										show : function(layout) {return layout.useImage}
									},
									
									dimensionImageDescDim:{
										ref: "dimensionImageDescD",
										type: "string",
										component: "text",
										label: "1st and last dimensions will be used to build the image",
										show: function(layout) { if( layout.useMeasure == true ){ return false } else { return true } }
									},
									dimensionImageDescMeasure:{
										ref: "dimensionImageDescM",
										type: "string",
										component: "text",
										label: "Last and 2nd to last Measures contain the image",
										show: function(layout) { if( layout.useMeasure == true ){ return true } else { return false } }
									},
									
									extensionImage:{
										ref:"extensionImage",
										type: "string",
										label: "Extension of the image file",
										defaultValue: "png",
										show: function(layout)  { 
											if (layout.useImage) { 
												if (layout.useMeasure) { return false } else { return true } 
											}
										}
									},
									imageLeft:{
										ref: "imageLeft",
										component: "switch",
										type: "boolean",
										label: "Image Left",
										translation: "Use image left",
										defaultValue: true,
										trueOption: {
										  value: true,
										  translation: "properties.on"
										},
										falseOption: {
										  value: false,
										  translation: "properties.off"
										},
										show: function(layout)  { if( layout.useImage ){ return true } else { return false } }
									},
									
									imageRight:{
										ref: "imageRight",
										component: "switch",
										type: "boolean",
										label: "Image Right",
										translation: "Use image right",
										defaultValue: true,
										trueOption: {
										  value: true,
										  translation: "properties.on"
										},
										falseOption: {
										  value: false,
										  translation: "properties.off"
										},
										show: function(layout)  { if( layout.useImage ){ return true } else { return false } }
									},
									
									urlImage:{
										ref: "urlImage",
										type: "string",
										label: "Full URL to online image folder",
										expression: "optional",
										defaultValue: "",
										show: function(layout)  { if( layout.useImage ){ return true } else { return false } }
									},
									
									
									sizeImage:{
										ref: "sizeImage",
										type: "integer",
										label: "Image width & height (px)",
										defaultValue: 80,
										min : 10,
										max : 100,
										show: function(layout)  { if( layout.useImage ){ return true } else { return false } }
									}
								}
							},								
							managemoreDimension:{
								type:"items",
								label:"Manage 7 and more Dimensions",
								items: {
									moreDimension:{
										ref: "moreDimension",
										component: "switch",
										type: "boolean",
										label: "Manage more than 4 dimensions",
										defaultValue: false,
										trueOption: {
											value: true										
										},
										falseOption: {
											value: false										
										},
										show: true
									},
									descriptionSeparateur:{
										ref: "separateur",
										label: "Define the separator to use between dimensions i.e ([dimension4] & '§' & [dimension5] & '§' & [dimension6]",
										type: "string",
										component: "text",
										show: function(layout) { return layout.moreDimension }
									},
									separateur:{
										ref: "separateur",
										label: "Add this separator",
										//in the last dimension i.e ([dimension4] & '§' & [dimension5] & '§' & [dimension6]",
										type: "string",
										defaultValue: "§",
										show: function(layout) { return layout.moreDimension }
									}
								}
							}
						}
					},	
					addons: {  
					     uses: "addons",  
					     items: {  
					          dataHandling: {  
					               uses: "dataHandling"  
					          }  
					     }  
					},
					settings: {
						uses: "settings"
					}	
				}
			},
			snapshot: {
				canTakeSnapshot: true
			}, 		
			support : {
				export: true
			},
			paint: function ( $element, layout ) {
				
				// Fonction format pop-up		
				function formatMoney(n, c, d, t, m, l){
					var c = isNaN(c = Math.abs(c)) ? 2 : c, 
						d = d == undefined ? "." : d, 
						t = t == undefined ? "," : t, 
						s = n < 0 ? "-" : "", 
						i = parseInt(n = Math.abs(+n || 0).toFixed(c)) + "", 
						j = (j = i.length) > 3 ? j % 3 : 0;
					   return l + ' \n ' + s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "")+ m;
				};
				
				function formatNumber(displayFormat, value, context,currencySymbol){
					if (displayFormat === "Number"){
						return formatMoney(value, 0, '.', ',',currencySymbol, context);
					}
					if (displayFormat === "Number1"){
						return formatMoney(value, 1, '.', ',',currencySymbol,context);
					}
					if (displayFormat === "Number2"){
						return formatMoney(value, 2, '.', ',',currencySymbol,context);
					}
				}		
				 
				 
				// Persistent color function
				var hashScale = d3.scale.linear().domain([1, 4294967295]).range([ 0, 19.9999 ]);
				
				
				function hashL(str) {
				  var hashL = 5381,
					  i    = str.length
				  while(i)
					hashL = (hashL * 33) ^ str.charCodeAt(--i) 
					//hash = md5(str)
				  return hashL >>> 0;
				}
				
				// JV Update v0.4: Nulls and alternative text may remove nodes
				function isValidNode(str){
					var excludeWords = [""];
					if (layout.nodeRemoveText != null){
						// the user is told to separate by ';'
						excludeWords = layout.nodeRemoveText.split(";").map(function(word, index){
							return word.trim();
						});
					}

					if (layout.nodeRemoveEmpty != null && layout.nodeRemoveEmpty && str === "-" 
						||
						excludeWords.indexOf(str) >= 0
						){
						return false;
					} else {
						return true;
					}
				}
				
						
				var _this 			= this;
				  
				var displayDimensionLabels = layout.displayDimensionLabels;  
				var displayFormat     = layout.displayFormat;
				var currencySymbol	= " " + layout.currencySymbol;
				var displaySeparateur = layout.displaySeparateur;
				var displayPalette    = layout.displayPalette;
				var colorPersistence  = layout.colorPersistence;
				var useImage  		= layout.useImage;
				var useMeasure		= (layout.useMeasure === undefined ? true : layout.useMeasure);
				var imageRight		= (layout.imageRight === undefined ? true : layout.imageRight);
				var imageLeft			= layout.imageLeft;
				var urlImage  		= layout.urlImage;
				var urlImageDesc  	= layout.urlImageDesc;
				var sizeImage			= (layout.sizeImage === undefined ? 80 : layout.sizeImage);
				var extensionImage	= (layout.extensionImage === undefined ? "png" : layout.extensionImage);
				var dimImageRight		= (layout.dimImageRight === undefined ? "" : layout.dimImageRight);
				var offset 			= $element.offset();
				var separator			= (layout.separateur === undefined ? "§" : layout.separateur);
				var nbImageDrawn		= 0;
				  

				//var flowColor = (layout.flowChoice == 2) ? layout.flowColorCustom : Theme.palette[layout.flowColor];
				//var flowColor = layout.flowColorCustom.color;
				  
				var qData = layout.qHyperCube.qDataPages[0];
				  // create a new array that contains the dimension labels
				var qDim  = layout.qHyperCube.qDimensionInfo.map(function(d) {
					return d.qFallbackTitle;
				});

				var divName 	= layout.qInfo.qId;
				var qMatrix 	= qData.qMatrix.sort();				 

				// JV Update v.1:  create a new object array with user defined color and sort parameters for dimension
				var qDimColorUser = layout.qHyperCube.qDimensionInfo.map(function(d){
					var m = typeof d.myColorSelection !== "undefined" ? d.myColorSelection : {};
					return {
						auto: typeof m.auto !== "undefined" ? m.auto : true,
						choice: typeof m.choice !== "undefined" ? m.choice : "random",
						colorPersistence: typeof m.colorPersistence !== "undefined" ? m.colorPersistence : false,
						displayPalette: typeof m.displayPalette !== "undefined" ? m.displayPalette : "D3-20c",
						single: typeof m.single !== "undefined" ? m.single : "#4477aa"
					}
				});  

				// JV Update v.1: create a new object array with user defined color parameters for flow
				// JV Update v.3:  each dimension will now have an attribute for outflow color
				var qFlowUser = layout.qHyperCube.qDimensionInfo.map(function(d){
					var m = typeof d.myFlowColorSelection !== "undefined" ? d.myFlowColorSelection : {};
					return {
						auto: typeof m.auto !== "undefined" ? m.auto : true,
						choice: typeof m.choice !== "undefined" ? m.choice : "random",
						colorPersistence: typeof m.colorPersistence !== "undefined" ? m.colorPersistence : false,
						displayPalette: typeof m.displayPalette !== "undefined" ? m.displayPalette : "D3-20c",
						single: typeof m.single !== "undefined" ? m.single : "#4477aa"
					}
				});  

				// JV Update v.2: same for sorting
				var qDimSortUser = layout.qHyperCube.qDimensionInfo.map(function(d){
					var m = typeof d.mySortSelection !== "undefined" ? d.mySortSelection : {};
					return {
						auto: typeof m.auto !== "undefined" ? m.auto : true,
						ascending: typeof m.ascending !== "undefined" ? m.ascending : true
					}
				});  
				
				// iterate through each row of the hypercube data
				var source = [];
				var lastrow = 0, me = this;
				
				// JV Update v0.4: Use the backendApi to iterate through AVAILABLE rows
				this.backendApi.eachDataRow(function(rownum, row){
					lastrow = rownum;
					var path 		= ""; 
					var sep 		= ""; 
					var nbDimension = qDim.length;
					var nbMesures 	= qMatrix[0].length - nbDimension;
					var nbTotal 	= nbMesures + nbDimension;
					
					var labels = [];
					var colors = [];
					var flowColors = [];
					var sortVals = [];
					var sortDirs = [];
					
					// only bother if the size of the measure is greater than zero
					if (row[nbDimension].qNum > 0){ 
						for (var i = 0; i < nbDimension ; i++) {
							
							var label = row[i].qText;
							
							labels = labels.concat(label);
							path += sep + (label.replace('|', ' ')) + '|' + (row[i].qElemNumber); 														
							sep = separator;
												
							// JV UPDATE v0.1: This now does the work of coloring the nodes
							// I removed the function "getColorForNode"
							if (qDimColorUser[i].auto==true || qDimColorUser[i].choice == "random"){
								//strValue = row[i].qText;
								if (qDimColorUser[i].displayPalette === "D3-20") {
									var colours = ['#1f77b4','#aec7e8','#ff7f0e','#ffbb78','#2ca02c','#98df8a','#d62728','#ff9896','#9467bd','#c5b0d5','#8c564b',
													'#c49c94','#e377c2','#f7b6d2','#7f7f7f','#c7c7c7','#bcbd22','#dbdb8d','#17becf','#9edae5' ];
								}
								else if (qDimColorUser[i].displayPalette === "D3-20b") {
									var colours = ['#393b79','#5254a3','#6b6ecf','#9c9ede','#637939','#8ca252','#b5cf6b','#cedb9c','#8c6d31','#bd9e39',
									'#e7ba52','#e7cb94','#843c39','#ad494a','#d6616b','#e7969c','#7b4173','#a55194','#ce6dbd','#de9ed6'];
								}
								else if (qDimColorUser[i].displayPalette === "D3-20c") {
									var colours = ['#3182bd','#6baed6',	'#9ecae1','#c6dbef','#e6550d','#fd8d3c','#fdae6b','#fdd0a2','#31a354',
										'#74c476','#a1d99b','#c7e9c0','#756bb1','#9e9ac8','#bcbddc','#dadaeb','#636363','#969696','#bdbdbd','#d9d9d9' ];
								}
								else if (qDimColorUser[i].displayPalette === "20") {
									var colours = [ '#1abc9c','#7f8c8d','#2ecc71','#bdc3c7','#3498db','#c0392b','#9b59b6','#d35400','#34495e','#f39c12',
										'#16a085','#95a5a6','#27ae60','#ecf0f1','#2980b9','#e74c3c','#8e44ad','#e67e22','#2c3e50','#f1c40f' ];
								}
								else if (qDimColorUser[i].displayPalette === "20a") {
									var colours = [ '#023FA5','#7D87B9','#BEC1D4','#D6BCC0','#BB7784','#FFFFFF','#4A6FE3','#8595E1','#B5BBE3','#E6AFB9',
									'#E07B91','#D33F6A','#11C638','#8DD593','#C6DEC7','#EAD3C6','#F0B98D','#EF9708','#0FCFC0','#9CDED6'];
								}			
								if (qDimColorUser[i].auto==true || !qDimColorUser[i].colorPersistence){
									colors = colors.concat(colours[Math.floor(Math.random() * (19))]);
								} else {
									colors = colors.concat(colours[parseInt(Math.floor(hashScale(hashL(md5(path)))))]);
								}							
							} else if (qDimColorUser[i].choice == "single"){
								colors = colors.concat(typeof qDimColorUser[i].single === "object" ? qDimColorUser[i].single.color : qDimColorUser[i].single);
							} else if (qDimColorUser[i].choice == "expression" && typeof row[i].qAttrExps.qValues !== "undefined" && row[i].qAttrExps.qValues.length >= 0 && typeof row[i].qAttrExps.qValues[0].qText !== "undefined") {
								colors = colors.concat(row[i].qAttrExps.qValues[0].qText);
							} else {
								colors = colors.concat("#888888"); //may happen if expression fails
							}				

							// JV UPDATE v0.2: same with sorting 
							// first we check if we are doing expression-based sorting
							if (qDimSortUser[i].auto==true || row[i].qAttrExps.qValues.length < 3){
								sortVals = sortVals.concat(null); // will use default	
								sortDirs = sortDirs.concat(true);
							} else {
								if (typeof row[i].qAttrExps.qValues[2].qNum !== "undefined"){
									sortVals = sortVals.concat(row[i].qAttrExps.qValues[2].qNum);
								} else if (typeof row[i].qAttrExps.qValues[2].qText !== "undefined"){
									sortVals = sortVals.concat(row[i].qAttrExps.qValues[2].qText);
								} else {
									sortVals = sortVals.concat(null);
								}
								sortDirs = sortDirs.concat(qDimSortUser[i].ascending);
							}						
					
							// JV Update v0.1: what color should the flow be
							// JV Update v0.3: there should an outflow color for each dimension except the last					
							if (qFlowUser[i].auto==true || qFlowUser[i].choice == "random"){
								//strValue = row[i].qText;
								if (qFlowUser[i].displayPalette === "D3-20") {
									var colours = ['#1f77b4','#aec7e8','#ff7f0e','#ffbb78','#2ca02c','#98df8a','#d62728','#ff9896','#9467bd','#c5b0d5','#8c564b',
													'#c49c94','#e377c2','#f7b6d2','#7f7f7f','#c7c7c7','#bcbd22','#dbdb8d','#17becf','#9edae5' ];
								}
								else if (qFlowUser[i].displayPalette === "D3-20b") {
									var colours = ['#393b79','#5254a3','#6b6ecf','#9c9ede','#637939','#8ca252','#b5cf6b','#cedb9c','#8c6d31','#bd9e39',
									'#e7ba52','#e7cb94','#843c39','#ad494a','#d6616b','#e7969c','#7b4173','#a55194','#ce6dbd','#de9ed6'];
								}
								else if (qFlowUser[i].displayPalette === "D3-20c") {
									var colours = ['#3182bd','#6baed6',	'#9ecae1','#c6dbef','#e6550d','#fd8d3c','#fdae6b','#fdd0a2','#31a354',
										'#74c476','#a1d99b','#c7e9c0','#756bb1','#9e9ac8','#bcbddc','#dadaeb','#636363','#969696','#bdbdbd','#d9d9d9' ];
								}
								else if (qFlowUser[i].displayPalette === "20") {
									var colours = [ '#1abc9c','#7f8c8d','#2ecc71','#bdc3c7','#3498db','#c0392b','#9b59b6','#d35400','#34495e','#f39c12',
										'#16a085','#95a5a6','#27ae60','#ecf0f1','#2980b9','#e74c3c','#8e44ad','#e67e22','#2c3e50','#f1c40f' ];
								}
								else if (qFlowUser[i].displayPalette === "20a") {
									var colours = [ '#023FA5','#7D87B9','#BEC1D4','#D6BCC0','#BB7784','#FFFFFF','#4A6FE3','#8595E1','#B5BBE3','#E6AFB9',
									'#E07B91','#D33F6A','#11C638','#8DD593','#C6DEC7','#EAD3C6','#F0B98D','#EF9708','#0FCFC0','#9CDED6'];
								}			
								if (qFlowUser[i].auto==true || !qFlowUser[i].colorPersistence){
									flowColors = flowColors.concat(colours[Math.floor(Math.random() * (19))]);
								} else {
									flowColors = flowColors.concat(colours[parseInt(Math.floor(hashScale(hashL(md5(path)))))]);
								}							
							} else if (qFlowUser[i].choice == "single"){
								flowColors = flowColors.concat(typeof qFlowUser.single === "object" ? qFlowUser.single.color : qFlowUser.single);
							} else if (qFlowUser[i].choice == "expression" && typeof row[i].qAttrExps.qValues !== "undefined" && row[i].qAttrExps.qValues.length >= 1 && typeof row[i].qAttrExps.qValues[1].qText !== "undefined") {
								flowColors = flowColors.concat(row[i].qAttrExps.qValues[1].qText);
							} else {
								flowColors = flowColors.concat("#888888"); //may happen if expression fails
							}	
						}

						// JV Update: add on the image stuff only if needed
						// btw, gauche is left in French, droite is right	
						var sourceOut = {
							"Labels": labels,
							"Colors": colors,
							"FlowColors": flowColors,
							"Path": path,
							"Frequency": row[nbDimension].qNum,
							"SortVals": sortVals,
							"SortDirs": sortDirs				
						};
						// add the image stuff, if we using images on both sides, 2nd to last measure is left, last is right
						// if only using either left or right, use last measure
						if (useImage && useMeasure){
							if (imageLeft && imageRight){
								sourceOut['Photogauche'] = row[nbTotal-2].qText;
								sourceOut['Photodroite'] = row[nbTotal-1].qText;
							} else if (imageLeft && !imageRight){
								sourceOut['Photogauche'] = row[nbTotal-1].qText;
							} else if (!imageLeft && imageRight){
								sourceOut['Photodroite'] = row[nbTotal-1].qText;
							}
						}

						// JV Update v0.4: just collect valid source (i.e., source with frequence > 0)

						source.push(sourceOut);	
					}
					
				});
				
				// JV Update v0.4: If the total number of rows in the hypercube is more than the amount we have gathered, request more (and repaint)
				if(this.backendApi.getRowCount() > lastrow +1){
			        //we havent got all the rows yet, so get some more, 1000 rows
			        //$("sk_"+ layout.qInfo.qId).empty();
			        var requestPage = [{
			            qTop: lastrow + 1,
			            qLeft: 0,
			            qWidth: 10, //should be # of columns
			            qHeight: Math.min( 1000, this.backendApi.getRowCount() - lastrow )
			        }];
			        this.backendApi.getData( requestPage ).then( function ( dataPages ) {
			            //when we get the result trigger paint again
			            me.paint( $element, layout );
			        });

			        var id = "sk_"+ layout.qInfo.qId;
			        if (document.getElementById(id)) {
			        	var updateText = '<h3>Updating ' + '.'.repeat(runningTick++) + '</h3>';
			        	if (runningTick > 10) runningTick = 1;
						$("#" + id).empty().append($(updateText));
					} 
			    } else { 
			    	// JV Update v0.4: we won't display until we have all the data
			    	

					var id = "sk_"+ layout.qInfo.qId;
							  
					if (document.getElementById(id)) {
						$("#" + id).empty();
					} else {
						$element.append($('<div />').attr("id", id));        
					}
					$("#" + id).width($element.width()).height($element.height());
					
					var linkDetails = [];
					var endArr = [];
					var catArray = [];
					
					//********Creates Duplicate IDs*************
					//		$element.attr("id",id)
					//******************************************
					//var td = _this.Data;
					var nodeNames = []; // just the path
					var nodeDetails = []; // more details
					var rev = false; //permet de pivoter les dimensions
					  

					// maximum number of possible paths through the diagram
					if (layout.limitFlow){
						source = source.slice(0, Math.min(layout.flowMax == null ? 1000 : layout.flowMax, source.length));
					}

					// go from rows to distinct nodes on the graph
					var tempNodeNames = [];
					var tempNodeDetails = [];
					source.forEach(function(row, index) {
						var path = row.Path;
						var val = parseFloat(row.Frequency);
						var tArr = path.split(separator);  
						var labels = row.Labels;
						var colors = row.Colors;
						var sortVals = row.SortVals;
						var sortDirs = row.SortDirs;
						
						//tArr.sort();
						if (rev) {
							tArr.reverse();
							colors.reverse();
						} 	 	
						if (tArr.length > 1) {
							$.each(tArr, function(i) {		
								var nodeLabel = this.split("|")[0].toString().trim();

								if (isValidNode(nodeLabel)){
									
									// JV Update 0.4: this is a temporary index, if dimensions are skipped it wiill be updated
									var nodeName = this.toString().trim() + "~" + i;	
								
									// add to nodes if not already present
									var nodeIndex = tempNodeNames.indexOf(nodeName);
									if (nodeIndex === -1){
										tempNodeNames.push(nodeName);
										tempNodeDetails.push({
											name: nodeName,
											label: nodeLabel,
											color: colors[i],
											sortVal: sortVals[i],
										 	sortDir: sortDirs[i],
										 	dimIndex: i,
										 	value: val
										});
									} else {
										// update the size of this node
										tempNodeDetails[nodeIndex].value += val;
									}									
								}
							});
						}
					});

					// JV Update 0.4: Do nodes exceed minimum size? if so, make sure this dimension index is included (for titling)
					var dimIndexRefs = [];
					tempNodeDetails.forEach(function(detail){
						if (detail.value >= (layout.nodeMinSize != null ? layout.nodeMinSize : 1)){
							if (dimIndexRefs.length === 0 || dimIndexRefs.indexOf(detail.dimIndex) === -1){
								dimIndexRefs.push(detail.dimIndex);
							}
						}
					});
					dimIndexRefs.sort();

					// JV Update 0.4: If Node is sufficently large rename index according to the "real dimensional index"  dimIndexFers
					tempNodeDetails.forEach(function(detail){
						if (detail.value >= (layout.nodeMinSize != null ? layout.nodeMinSize : 1)){
							// update the dimIndex to reflect valid dimension positions
							detail.dimIndex = dimIndexRefs.indexOf(detail.dimIndex);
							detail.name = detail.name.split("~")[0] + "~" + detail.dimIndex;
							
							nodeDetails.push(detail);
							nodeNames.push(detail.name);
						}
					});

					// go from rows to links
					var tempLinkDetails = [];
					source.forEach(function(row) {
						var path = row.Path
						var val = parseFloat(row.Frequency); // all frequencies should be greater than 0 from above code
						var flowColors = row.FlowColors;
					  
						if (useMeasure == true) {
						   var photog = row.Photogauche;
						   var photod = row.Photodroite;
					  	}					 
					  	
				  		var tArr = path.split(separator);  
			  
				  		if (rev) {
							tArr.reverse();
						} 	 	
				  		if (tArr.length > 1) {
				  			var prevDimIndex = -1;
				  			$.each(tArr, function(i) {
				  				var nodeLabel = this.split("|")[0].toString().trim();

								if (isValidNode(nodeLabel)){
									var dimIndex = dimIndexRefs.indexOf(i);
									
									// JV Update v0.4: we make links out of previous dimension and current
									if(dimIndex > 0 && prevDimIndex >= 0){
										//var prevDimIndex = dimIndex - 1;
										var nodeName = this + "~" + dimIndex;	
										var nodeLabelPrev = tArr[dimIndexRefs[prevDimIndex]].split("|")[0].toString().trim();
										var nodeNamePrevious =  tArr[dimIndexRefs[prevDimIndex]].toString().trim() + "~" + prevDimIndex;	
										//var nodeName = tArr[i].toString().trim() + "~" + (isLastDim[i] ? "end" : runningIndex);
										
										var tFlag = false;
										var cS = $.inArray(nodeNamePrevious, nodeNames);
										var cT = $.inArray(nodeName, nodeNames);

										// JV Update 0.3: Do not include links that go to null nodes	
										if (cS > -1 && cT > -1){
											$.each(tempLinkDetails, function(i, v) {											
												if (v.source === cS && v.target === cT) { 
													// link already exists update size
													tFlag = true;
													v.value = v.value + val;
												}
											});
											// add new links
											if (!tFlag){
												var linkObj = {
													"source" : cS,
													"target" : cT,
													"value" : val,
													"FlowColor": flowColors[dimIndexRefs[prevDimIndex]]
												};
												if (useMeasure){
													linkObj["Photogauche"] = photog;
													linkObj["Photodroite"] = photod;
												}
												tempLinkDetails.push(linkObj);
											}
										}
									}
									prevDimIndex = dimIndex;
								}
							});							
						}
					});
					
					tempLinkDetails.forEach(function(detail){
						if (detail.value >= (layout.linkMinSize != null ? layout.linkMinSize : 1)){
							linkDetails.push(detail);
						}
					});

				  // Ajuste le graph si image droite ou gauche
				  if(useImage == true) {
					if(imageRight == true && imageLeft == true) {
						var marginRight 		= sizeImage;
						var marginLeft 			= sizeImage;
						var widthGraph 			= $element.width() - 115;
						var senseSankeyWidth 	= 40;
					}
					if(imageRight == false && imageLeft == true) {
						var marginRight 		= 1;
						var marginLeft 			= sizeImage;
						var widthGraph 			= $element.width() - 35;
						var senseSankeyWidth 	= 40;
					}
					if(imageRight == true && imageLeft == false) {
						var marginRight 		= sizeImage;
						var marginLeft 			= 1;
						var widthGraph 			= $element.width() - 35;
						var senseSankeyWidth 	= 40;
					}
					if(imageRight == false && imageLeft == false) {
						var marginRight 		= 1;
						var marginLeft 			= 1;
						var widthGraph 			= $element.width();
						var senseSankeyWidth 	= 10;
					}
				  } else {
						var marginRight 		= 1;
						var marginLeft 			= 1;
						var widthGraph 			= $element.width();
						var senseSankeyWidth 	= 10;
				  }

				  var margin = {
					  top : 5,
					  right : marginRight,
					  bottom : 0,
					  left : marginLeft
					}, 
					width = widthGraph, 
					height = $element.height();

					var svgWidth = width + margin.left + margin.right;	
					var svgHeight = height + margin.top + margin.bottom;
					
					var svg = d3.select("#sk_" + divName).append("svg").attr("id", "svg-sankey")
					.attr("width", svgWidth).attr("height", svgHeight)
					.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");
				  	
				  	var sankey = senseSankey().nodeWidth(15).nodePadding(10).size([width - senseSankeyWidth , height - 10]);
					var path = sankey.link();
					sankey.nodes(nodeDetails).links(linkDetails).layout(32);
				
						
					// JV Update v0.4: Put titles above the top nodes in its own element
					//var runningIndex = -1;
					if (displayDimensionLabels){
						var titleHTML = "<div id='dimLabels' style='display:flex; flex-direction:column; min-height:20px'>"
						for (var d = 0; d < dimIndexRefs.length; d++){
							var di = dimIndexRefs[d];
							//if (!dimIsNull[d]){
								//runningIndex++;
								var dimTitle = qDim[di];
								// find min x of this dimension
								var xvalue = 1000000;
								for (var ni = 0; ni < nodeDetails.length; ni++){
									if (nodeDetails[ni].dimIndex === d){
										xvalue = Math.min(nodeDetails[ni].x, xvalue);
										//break;
									}
								}
								if (d === dimIndexRefs.length - 1){
									xvalue = xvalue - dimTitle.length*4;
								}
								titleHTML += "<span style='position:absolute; left:" + xvalue + "px;'>" + dimTitle + "</span>";
							//}
						}
						titleHTML += "</div>";
						// add this title before the svg (but only if there is enough room)
						if (xvalue > 200){
							$("#" + id).prepend(titleHTML);
							// resize the sankey to fit the new labels
							var titleHeight = $("#dimLabels").height();
							var newHeightScale = (svgHeight - titleHeight) / svgHeight;
							svg.attr("transform", "scale(1, " + newHeightScale + "), translate(" + margin.left + "," + margin.top +")");											
						}
					}
					
					var link = svg.append("g").selectAll(".link").data(linkDetails).enter().append("path").attr("class", "link").attr("d", path)
								.style("stroke-width",function(d) {
									return Math.max(1, d.dy);
								})
								.style("stroke", function(d){
									return d.FlowColor;
								})
								.sort(function(a, b) {
									return b.dy - a.dy;
								});
					
					
					$('.ttip').remove(); //We make sure there isn't any other tooltip div in the dom

					// Create tooltip div 
					var  tooltip = d3.select("body")
							.append("div")
							.attr("class","ttip")
							.attr("id","ttip")
							.style("position", "absolute")
							.style("z-index", "10")
							.style("visibility", "hidden");	
					
					//Link tooltip
					link.on("mouseover", function(d){
							var start = d.source.name.split('|')[0];
							var end = d.target.name.split('|')[0];
							var targetValue = formatNumber(displayFormat,d.value,'',currencySymbol);
							
							tooltip.html("<b>"+start+"</b>"+displaySeparateur+"<b>"+end+"</b><br/>"+targetValue);			
							return tooltip.style("visibility", "visible");})
						.on("mousemove", function(d){
							var start = d.source.name.split('|')[0];
							var end = d.target.name.split('|')[0];
							var targetValue = formatNumber(displayFormat,d.value,'',currencySymbol);
							tooltip.html("<b>"+start+"</b>"+displaySeparateur+"<b>"+end+"</b><br/>"+targetValue);
							return tooltip.style("top",(d3.event.pageY-10)+"px").style("left",(d3.event.pageX+10)+"px");
						})
						.on("mouseout", function(){
							return tooltip.style("visibility", "hidden");
						});
					
					var node = svg
					.append("g").selectAll(".node").data(nodeDetails).enter().append("g").attr("class", "node").attr("transform", function(d) {
					  return "translate(" + (d.x) + "," + d.y + ")";
					})
					
					node.on("click",function(d, i) {
						//on passe a la fonction l'identifiant qElement precedemment stocké dans le nom et le nom de la dimension sous forme d'un tableau
						
						_this.backendApi.selectValues(
							parseInt(d.name.split('~')[1].replace('end', qDim.length - 1)),
							[ parseInt(d.name.split('~')[0].split('|')[1]) ],
							true
						);
					})
					
					link.on("click",function(d,i){
						_this.backendApi.selectValues(
							parseInt(d.target.name.split('~')[1].replace('end', qDim.length - 1)), //DAP: As we already selected a link, it make sense to select the source and target dimensions and filter the data
							[ parseInt(d.target.name.split('~')[0].split('|')[1]) ],
							true
						);
						_this.backendApi.selectValues(
							parseInt(d.source.name.split('~')[1].replace('end', qDim.length - 1)),
							[ parseInt(d.source.name.split('~')[0].split('|')[1]) ],
							true
						);	
						$('.ttip').remove(); //remove tooltip object on click.
					});		
								
					//dessin du noeud
					node.append("text").attr("class", "nodeTitle").attr("x", -6).attr("y", function(d) {
						  return d.dy / 2;
					}).attr("dy", ".35em").attr("text-anchor", "end").attr("transform", null).text(function(d) {
					  var str = d.name.substring(0, d.name.indexOf("~")).split('|')[0];
					  return str 
					}).filter(function(d) {
					  return d.x < width / 2;
					}).attr("x", 6 + sankey.nodeWidth()).attr("text-anchor", "start");
					
					// AVEC POPUP sur le carré de couleur
					node.append("rect").attr("height", function(d) {
					  return d.dy;
					}).attr("width", sankey.nodeWidth()).style("fill", function(d) {
					   return d.color; // JV Update, color is now stored with the node				 
					}).style("stroke", function(d) {
					  return d3.rgb(d.color).darker(2);
					});
					
										
					// Dessine les images
					if (useImage == true && (imageLeft == true || imageRight == true)) {
					//	if ((imageLeft == true && position == 0) || (imageRight == true && position == qDim.length -1 ) ){
															
						node.append("image")
							.attr("xlink:href", function(d) {
								var nameImage = "";
								var position = parseInt(d.name.split('~')[1].replace('end', qDim.length - 1));
								
								if (position == 0 || position == qDim.length - 1) { //seulement pour le premier et dernier
		 					 						 
									//if (useMeasure === true && imageLeft == true ) {
									if (useMeasure === true) {
										if (position == 0 && imageLeft == true) { //pour le premier c'est toujours photogauche
											nameImage=d.sourceLinks[0].Photogauche;
										}
										if (position != 0 && imageRight == true) { //pour le dernier c'est toujours photodroite
											nameImage=d.targetLinks[0].Photodroite;
										}
										
									}
									else { //on utilise les dimensions
										if ((imageLeft == true && position == 0) || (imageRight == true && position == qDim.length -1 ) ){
											nameImage=d.name.substring(0, d.name.indexOf("~")).split('|')[0];
											nameImage = nameImage + "." + extensionImage;
										}
									}
								
								// extension dynamique
								return urlImage + nameImage;
							}
							})
							.attr("style", "background-color: transparent; opacity: 1;")
							.attr("height", sizeImage + "px")
							.attr("width",  sizeImage + "px")
							.attr("x", sizeImage / 4)
							.attr("y", function(d) {
								return d.dy / 2 - (sizeImage / 2);
							})
							.attr("text-anchor", "end")
							.filter(function(d) {
								return d.x < sizeImage + 15;
							})
							.attr("x", sankey.nodeWidth() - (sizeImage + 17))
							.attr("text-anchor", "start");
						//}
					}

					//Node tooltip
					node.on("mouseover", function(d){
						var level = d.name.substr(d.name.indexOf("~")+1,1);
						var edgeMargin= 0; //Last nodes might not have enough space for the tooltip, so we add a negative margin to push the tooltip on the left
						// test si on est à la fin du flux ou pas
						if (level === "e" ){
							level = qDim.length -1;
							edgeMargin=-80;
						}
						var entete = qDim[level] + ' : ' + d.name.split('|')[0];
						var value=formatNumber(displayFormat,d.value,'',currencySymbol);
							
						tooltip.html("<b>"+entete+"</b><br/>"+value);			
						return tooltip.style("visibility", "visible").style("top",(d3.event.pageY+10)+"px").style("left",(d3.event.pageX+10+edgeMargin)+"px");
					})
					.on("mousemove", function(d){
						var edgeMargin= 0;
						var level = d.name.substr(d.name.indexOf("~")+1,1);
						// test si on est à la fin du flux ou pas
						if (level === "e" ){
							level = qDim.length -1;
							edgeMargin=-80;
						}
						
						var entete = qDim[level] + ' : ' + d.name.split('|')[0];		
						var value=formatNumber(displayFormat,d.value,'',currencySymbol);
							
				
						tooltip.html("<b>"+entete+"</b><br/>"+value);
						return tooltip.style("top",(d3.event.pageY+10)+"px").style("left",(d3.event.pageX+10+edgeMargin)+"px");
					})
					.on("mouseout", function(){
						return tooltip.style("visibility", "hidden");
					});
					
					return qlik.Promise.resolve();
				}
			}        
		};
} );
