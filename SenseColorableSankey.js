/**
*	Jonathan Vitale
*   Major code changes from Xavier Le Pitre's version 2.31
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
		var SenseColorableSankeyVersion = "0.2";

		$( "<style>" ).html( cssContent ).appendTo( "head" );
		return {
			initialProperties: {
				version: SenseColorableSankeyVersion,
				qHyperCubeDef: {
					qDimensions: [],
					qMeasures: [],
					qInitialDataFetch: [{
						qWidth: 7,
						qHeight: 1400
					}]
				},
				selectionMode: "QUICK"
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
						max: 2
					},
								
					SankeyGroup: {
						label: "Sankey Settings",
						component:"expandable-items",
						items : {
							Appearance: {
								label: "Labels",
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
									}
								}
							}, 
							FlowOps: {
								label : "Flow Options",
								type:"items",
								items : {
									flowMax:{
										type: "integer",
										label: "Flow max (10 to 2000)",
										ref: "flowMax (max is 2000)",
										defaultValue: 500,
										min : 10,
										max : 2000
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
									},
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
						return formatMoney(value, 0, '.', ' ',currencySymbol, context);
					}
					if (displayFormat === "Number1"){
						return formatMoney(value, 1, '.', ' ',currencySymbol,context);
					}
					if (displayFormat === "Number2"){
						return formatMoney(value, 2, '.', ' ',currencySymbol,context);
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
				
				
						
				var _this 			= this;
				var maxHeight         = (layout.flowMax === undefined ? 500 : layout.flowMax);
				  
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

				// JV Update v0.3: Find dimensions that are completely null
				var dimIsNull = [];  
				var qDimNullsRemoved = [];
				for (var d = 0; d < layout.qHyperCube.qDimensionInfo.length; d++){  
				     dimIsNull[d] = layout.qHyperCube.qDimensionInfo[d].qCardinal > 0 ? false : true;  
				     if (!dimIsNull[d]){
				     	qDimNullsRemoved = qDimNullsRemoved.concat(qDim[d]);
				     }
				}  

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
				var source 		= qMatrix.map(function(d) {					  
					var path 		= ""; 
					var sep 		= ""; 
					var nbDimension = 0;
					var nbDimension = qDim.length;
					var nbMesures 	= qMatrix[0].length - nbDimension;
					var nbTotal 	= nbMesures + nbDimension;
					
					var labels = [];
					var colors = [];
					var flowColors = [];
					var sortVals = [];
					var sortDirs = [];
					var dimensionIndices = []; // keep track of original dimension index in case we drop because of null values
					
					for (var i = 0; i < nbDimension ; i++) {
						if (!dimIsNull[i]){
						
							var label = d[i].qText;
							dimensionIndices = dimensionIndices.concat(i);
							labels = labels.concat(label);
							path += sep + (label.replace('|', ' ')) + '|' + (d[i].qElemNumber); 														
							sep = separator;
												
							// JV UPDATE v0.1: This now does the work of coloring the nodes
							// I removed the function "getColorForNode"
							if (qDimColorUser[i].auto==true || qDimColorUser[i].choice == "random"){
								//strValue = d[i].qText;
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
							} else if (qDimColorUser[i].choice == "expression" && typeof d[i].qAttrExps.qValues !== "undefined" && d[i].qAttrExps.qValues.length >= 0 && typeof d[i].qAttrExps.qValues[0].qText !== "undefined") {
								colors = colors.concat(d[i].qAttrExps.qValues[0].qText);
							} else {
								colors = colors.concat("#888888"); //may happen if expression fails
							}				

							// JV UPDATE v0.2: same with sorting 
							// first we check if we are doing expression-based sorting
							if (qDimSortUser[i].auto==true || d[i].qAttrExps.qValues.length < 3){
								sortVals = sortVals.concat(null); // will use default	
								sortDirs = sortDirs.concat(true);
							} else {
								if (typeof d[i].qAttrExps.qValues[2].qNum !== "undefined"){
									sortVals = sortVals.concat(d[i].qAttrExps.qValues[2].qNum);
								} else if (typeof d[i].qAttrExps.qValues[2].qText !== "undefined"){
									sortVals = sortVals.concat(d[i].qAttrExps.qValues[2].qText);
								} else {
									sortVals = sortVals.concat(null);
								}
								sortDirs = sortDirs.concat(qDimSortUser[i].ascending);
							}
						
					
							// JV Update v0.1: what color should the flow be
							// JV Update v0.3: there should an outflow color for each dimension except the last					
							if (qFlowUser[i].auto==true || qFlowUser[i].choice == "random"){
								//strValue = d[i].qText;
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
							} else if (qFlowUser[i].choice == "expression" && typeof d[i].qAttrExps.qValues !== "undefined" && d[i].qAttrExps.qValues.length >= 1 && typeof d[i].qAttrExps.qValues[1].qText !== "undefined") {
								flowColors = flowColors.concat(d[i].qAttrExps.qValues[1].qText);
							} else {
								flowColors = flowColors.concat("#888888"); //may happen if expression fails
							}	
						}
					}

					// JV Update: add on the image stuff only if needed
					// btw, gauche is left in French, droite is right	
					var sourceOut = {
						"Labels": labels,
						"Colors": colors,
						"FlowColors": flowColors,
						"Path": path,
						"Frequency": d[nbDimension].qNum,
						"SortVals": sortVals,
						"SortDirs": sortDirs				
					}	
					// add the image stuff, if we using images on both sides, 2nd to last measure is left, last is right
					// if only using either left or right, use last measure
					if (useImage && useMeasure){
						if (imageLeft && imageRight){
							sourceOut['Photogauche'] = d[nbTotal-2].qText;
							sourceOut['Photodroite'] = d[nbTotal-1].qText;
						} else if (imageLeft && !imageRight){
							sourceOut['Photogauche'] = d[nbTotal-1].qText;
						} else if (!imageLeft && imageRight){
							sourceOut['Photodroite'] = d[nbTotal-1].qText;
						}
					}
					return sourceOut;
				});
				

				var id = "sk_"+ layout.qInfo.qId;
						  
				if (document.getElementById(id)) {
					$("#" + id).empty();
				} else {
					$element.append($('<div />').attr("id", id));        
				}
				$("#" + id).width($element.width()).height($element.height());
				
				var sLinks = [];
				var endArr = [];
				var catArray = [];
				
				//********Creates Duplicate IDs*************
				//		$element.attr("id",id)
				//******************************************
				//var td = _this.Data;
				var sNodes = []; // just the path
				var jNodes = []; // more details
				var rev = 0; //permet de pivoter les dimensions
				  
				 
				source=source.slice(0,maxHeight);
				
				// go from rows to distinct nodes on the graph
				source.forEach(function(d) {
					//var row = d;
					var path = d.Path;
					var val = parseFloat(d.Frequency);
					if(val > 0) {
						var tArr = path.split(separator);  
						var labels = d.Labels;
						var colors = d.Colors;
						var sortVals = d.SortVals;
						var sortDirs = d.SortDirs;
						//tArr.sort();
						if (rev == "1") {
							tArr.reverse();
							colors.reverse();
						} 	 	
						if (tArr.length > 1) {
							$.each(tArr, function(i) {							
								if(tArr.length === (i + 1)){
									tArr[i] = this.toString().trim() + "~end";
								} else {
									tArr[i] = this.toString().trim() + "~" + i;	
								}
							});
							$.each(tArr, function(i) {
								if ($.inArray(this.toString().trim(), sNodes) === -1
									&& labels[i] !== "-" // JV Update 0.3: Eliminate nodes representing null	
								) {
									sNodes.push(this.toString().trim());
									jNodes.push({
										name: this.toString().trim(),
										color: colors[i],
										sortVal: sortVals[i],
									 	sortDir: sortDirs[i],
									 	dimIndex: i
									});
								}
							});
						}
					}
				});

				// go from rows to links
				source.forEach(function(d) {
					//var row = d;
					var path = d.Path
					var val = parseFloat(d.Frequency);
					var flowColors = d.FlowColors;
				  
					if (useMeasure == true) {
					   var photog = d.Photogauche;
					   var photod = d.Photodroite;
				  	}
				 
				  	if(val > 0) {
				  		var tArr = path.split(separator);  
			  
				  		if (rev == "1") {
							tArr.reverse();
						} 	 	
				  		if (tArr.length > 1) {
							$.each(tArr, function(i) {
							
								if(tArr.length === (i + 1)){
									tArr[i] = this.toString().trim() + "~end";
								} else {
									tArr[i] = this.toString().trim() + "~" + i;	
								}
							});
					
							$.each(tArr, function(i) {
								var tFlag = "no";
								if ((i + 1) != tArr.length) {
									////console.info(this.toString().trim() + " to " + tArr[i + 1]);
									var cS = $.inArray(this.toString().trim(), sNodes);
									var cT = $.inArray(tArr[i + 1].toString().trim(), sNodes);

									// JV Update 0.3: Do not include links that go to null nodes	
									if (cS > -1 && cT > -1){
										//////console.info(cT + " " + cS);
										$.each(sLinks, function(i, v) {
											
											if (v.source === cS && v.target === cT) { 
												// link already exists update size
												tFlag = "yes";
												v.value = v.value + val;
											}
										});
										if ((tFlag == "no") &&  (useMeasure == true)) {
											sLinks.push({
												"source" : cS,
												"target" : cT,
												"value" : val,
												"Photogauche" : photog,
												"Photodroite" : photod,
												"FlowColor": flowColors[i]
											});
										}
										if ((tFlag == "no") &&  (useMeasure == false)) {
											sLinks.push({
												"source" : cS,
												"target" : cT,
												"value" : val,
												"FlowColor": flowColors[i]
											});
										}
									}
								}
							});
						}
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
				  top : displayDimensionLabels ? 22 : 5,
				  right : marginRight,
				  bottom : 0,
				  left : marginLeft
				}, 
				width = widthGraph, 
				height = $element.height();
				
				var svg = d3.select("#sk_" + divName).append("svg").attr("width", width + margin.left + margin.right).attr("height", height + margin.top + margin.bottom).append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");
			  
				var sankey = senseSankey().nodeWidth(15).nodePadding(10).size([width - senseSankeyWidth , height - 10]);
				var path = sankey.link();

				sankey.nodes(jNodes).links(sLinks).layout(32);
				
				
				var link = svg.append("g").selectAll(".link").data(sLinks).enter().append("path").attr("class", "link").attr("d", path)
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
				.append("g").selectAll(".node").data(jNodes).enter().append("g").attr("class", "node").attr("transform", function(d) {
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

				// JV Update v0.3: Put titles above the top nodes
				if (displayDimensionLabels){
					node.append("text").attr("class", "dimTitle")
					.attr("x", function(d){
						if (d.dimIndex == 0){
							return 0;
						} else if (d.dimIndex == qDim.length-1){
							return d.dx - (qDimNullsRemoved[d.dimIndex].length-1) * 20;
						} else {
							return d.dx/2 - (qDimNullsRemoved[d.dimIndex].length-1) * 10;
						}
					})
					.attr("y", -5)
					.filter(function(d){
						return d.y < 1; // only add titles for the top nodes
					})
					.text(function(d){
						return qDimNullsRemoved[d.dimIndex];
					});
				}
				
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
		};
} );
