/**
*	Jonathan Vitale
*   Major code changes from Xavier Le Pitre's version 2.31
*	
*	v1.0: 
*		- In the definition of dimensions, we now include options for coloring. Users first have the option of "auto" coloring.
*			The auto color is random (not persistent). If auto is switched off a drop-down with several options appears, including
*			random, single color, and expression. For random, persistence means that a node will always
*			have the same color based upon its text and position. For expression, you can use the dimension names, like
*				If(D1 = 10, '#FF0000', '#00000'). Set different expressions for each dimension.
*		- The Sankey Settings area of the panel, now separates Flow Options (e.g. max flow) and Flow Colors. The flow colors
*			works in the same way as the dimensions, but creates a new measure. Use expressions like the following to color
*				If(D1 = 10 and D2 = 20, '#FF0000', '#00000')
*		- Turned on the exporting option.
*		- lots of formatting clean up.
**/

requirejs.config({
  shim : {
	"extensions/SenseColorableSankey/sankeymore" : {
	  deps : ["extensions/SenseColorableSankey/d3.min"],
	  exports: 'd3.sankey'
	}
  }
});

define(
	[
	"jquery", 
	"text!./style.css",
	"text!themes/old/sense/theme.json",
	"extensions/SenseColorableSankey/md5.min",
	"extensions/SenseColorableSankey/sankeymore"	
	],
		
	function($, cssContent, Theme, md5) {
		
		'use strict';
		Theme = JSON.parse(Theme);
		var SenseColorableSankeyVersion = "1.0";

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
                                ]
                                ,defaultValue: true
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
									return 
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
									},
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
									return 
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
									return 
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
									return 
								}
							},
							colorExpression:{
								type: "string",
								//component: "expression",
								label: "Enter color expression",
								ref:"qAttributeExpressions.0.qExpression",
								expression:"optional",
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
									return 
								}
							}
						}				
					},
					measures: {
						uses: "measures",
						min: 1,
						max: 3
					},
					//sorting: {
					//	uses: "sorting"
					//},
							
					SankeyGroup: {
						label: "Sankey Settings",
						component:"expandable-items",
						items : {
							FlowOpts:{
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
								}	
							},
							FlowColors:{
								label : "Flow Colors",
								type:"items",
								items : {
									flowColorSwitch:{
										type: "boolean",
										component: "switch",
										label: "Colors",
										ref:"myFlowColorSelection.auto",
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
										label:"Choose a color method",
										ref:"myFlowColorSelection.choice",
										options: [
											{label: "Random", value:"random"},
											{label: "Single color", value:"single"},
											{label: "By expression", value:"expression"}
										],
										show : function(layout) {
											if (typeof layout === 'object'){
												if (typeof layout.myFlowColorSelection === 'object' && typeof layout.myFlowColorSelection.auto !== 'undefined'){
													return !layout.myFlowColorSelection.auto;
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
										label : "Palette",
										ref:"myFlowColorSelection.displayPalette",
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
												if (typeof layout.myFlowColorSelection === 'object' && typeof layout.myFlowColorSelection.choice !== 'undefined'){
													return !layout.myFlowColorSelection.auto && layout.myFlowColorSelection.choice === 'random';
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
										ref: "myFlowColorSelection.colorPersistence",
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
												if (typeof layout.myFlowColorSelection === 'object' && typeof layout.myFlowColorSelection.choice !== 'undefined'){
													return !layout.myFlowColorSelection.auto && layout.myFlowColorSelection.choice === 'random';
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
										label: "Color",
										ref: "myFlowColorSelection.single",
										dualOutput: true,
										defaultValue: 1,
										show : function(layout) {
											if (typeof layout === 'object'){
												if (typeof layout.myFlowColorSelection === 'object' && typeof layout.myFlowColorSelection.choice !== 'undefined'){
													return !layout.myFlowColorSelection.auto && layout.myFlowColorSelection.choice === 'single';
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
										component: "expression",
										label: "Enter color expression",
										ref:"qHyperCubeDef.qMeasures.1.qDef.qDef",
										//expression:"always",
										show : function(layout) {
											if (typeof layout === 'object'){
												if (typeof layout.myFlowColorSelection === 'object' && typeof layout.myFlowColorSelection.choice !== 'undefined'){
													return !layout.myFlowColorSelection.auto && layout.myFlowColorSelection.choice === 'expression';
												} else { 
													return false;
												}
											} else {
												return false;
											}
											return										
										}
									}
								}
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
											tooltip: "2nd and 3rd Measure contain the image"
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
										label: "2nd and 3rd Measure contain the image",
										show: function(layout) { if( layout.useMeasure == true ){ return true } else { return false } }
									},
									
									extensionImage:{
										ref:"extensionImage",
										type: "string",
										label: "Extension of the image file",
										defaultValue: "png",
										show: function(layout)  { if (layout.useImage) 
													{ 
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
									moreDimension: {
										ref: "moreDimension",
										component: "switch",
										type: "boolean",
										label: "Manage more than 4 dimensions",
										defaultValue: false,
										trueOption: {
											value: true,
										
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
				  
				var displayFormat     = layout.displayFormat;
				var currencySymbol	= " " + layout.currencySymbol;
				var displaySeparateur = layout.displaySeparateur;
				//var displayPalette    = layout.displayPalette;
				//var colorPersistence  = layout.colorPersistence;
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
				  
				  
				var qData = layout.qHyperCube.qDataPages[0];
				// create a new array that contains the dimension labels
				var qDim  = layout.qHyperCube.qDimensionInfo.map(function(d) {
					return d.qFallbackTitle;
				});
				// create a new object array with user defined color parameters for dimension
				var qDimUser = layout.qHyperCube.qDimensionInfo.map(function(d){
					var m = typeof d.myColorSelection !== "undefined" ? d.myColorSelection : {};
					return {
						auto: typeof m.auto !== "undefined" ? m.auto : true,
						choice: typeof m.choice !== "undefined" ? m.choice : "random",
						colorPersistence: typeof m.colorPersistence !== "undefined" ? m.colorPersistence : false,
						displayPalette: typeof m.displayPalette !== "undefined" ? m.displayPalette : "D3-20c",
						single: typeof m.single !== "undefined" ? m.single : "#4477aa"
					}
				});

				// create a new object array with user defined color parameters for flow
				var m = typeof layout.myFlowColorSelection !== "undefined" ? layout.myFlowColorSelection : {};
				var qFlowUser = {
						auto: typeof m.auto !== "undefined" ? m.auto : true,
						choice: typeof m.choice !== "undefined" ? m.choice : "random",
						colorPersistence: typeof m.colorPersistence !== "undefined" ? m.colorPersistence : false,
						displayPalette: typeof m.displayPalette !== "undefined" ? m.displayPalette : "D3-20c",
						single: typeof m.single !== "undefined" ? m.single : "#4477aa"
				}
				  
				var divName 	= layout.qInfo.qId;
				var qMatrix 	= qData.qMatrix.sort();

				// iterates through each row
				var source 		= qMatrix.map(function(d) {					  
					var path 		= ""; 
					var sep 		= ""; 
					var nbDimension = 0;
					var nbDimension = qDim.length;
					var nbMesures 	= qMatrix[0].length- nbDimension;
					var finalIndex = qMatrix[0].length - 1;
					var nbTotal 	= nbMesures+nbDimension;
					var colors = [];
					var flowColor = "#888888";
					//for (var i = 0; i < d.length - 1; i++) {
					
					for (var i = 0; i < nbDimension; i++) {
						path += sep + (d[i].qText.replace('|', ' ')) + '|' + (d[i].qElemNumber); 
						sep = separator;
					}			

					// JV UPDATE: This now does the work of coloring the nodes
					// I removed the function "getColorForNode"
					// new code for coloring the dimensions by either random (default), random (persistent), single, or expression
					for (var i = 0; i < nbDimension; i++){
						// first we check what style of coloring to use
						if (qDimUser[i].auto==true || qDimUser[i].choice == "random"){
							//strValue = d[i].qText;
							if (qDimUser[i].displayPalette === "D3-20") {
								var colours = ['#1f77b4','#aec7e8','#ff7f0e','#ffbb78','#2ca02c','#98df8a','#d62728','#ff9896','#9467bd','#c5b0d5','#8c564b',
												'#c49c94','#e377c2','#f7b6d2','#7f7f7f','#c7c7c7','#bcbd22','#dbdb8d','#17becf','#9edae5' ];
							}
							else if (qDimUser[i].displayPalette === "D3-20b") {
								var colours = ['#393b79','#5254a3','#6b6ecf','#9c9ede','#637939','#8ca252','#b5cf6b','#cedb9c','#8c6d31','#bd9e39',
								'#e7ba52','#e7cb94','#843c39','#ad494a','#d6616b','#e7969c','#7b4173','#a55194','#ce6dbd','#de9ed6'];
							}
							else if (qDimUser[i].displayPalette === "D3-20c") {
								var colours = ['#3182bd','#6baed6',	'#9ecae1','#c6dbef','#e6550d','#fd8d3c','#fdae6b','#fdd0a2','#31a354',
									'#74c476','#a1d99b','#c7e9c0','#756bb1','#9e9ac8','#bcbddc','#dadaeb','#636363','#969696','#bdbdbd','#d9d9d9' ];
							}
							else if (qDimUser[i].displayPalette === "20") {
								var colours = [ '#1abc9c','#7f8c8d','#2ecc71','#bdc3c7','#3498db','#c0392b','#9b59b6','#d35400','#34495e','#f39c12',
									'#16a085','#95a5a6','#27ae60','#ecf0f1','#2980b9','#e74c3c','#8e44ad','#e67e22','#2c3e50','#f1c40f' ];
							}
							else if (qDimUser[i].displayPalette === "20a") {
								var colours = [ '#023FA5','#7D87B9','#BEC1D4','#D6BCC0','#BB7784','#FFFFFF','#4A6FE3','#8595E1','#B5BBE3','#E6AFB9',
								'#E07B91','#D33F6A','#11C638','#8DD593','#C6DEC7','#EAD3C6','#F0B98D','#EF9708','#0FCFC0','#9CDED6'];
							}			
							if (qDimUser[i].auto==true || !qDimUser[i].colorPersistence){
								colors = colors.concat(colours[Math.floor(Math.random() * (19))]);
							} else {
								colors = colors.concat(colours[parseInt(Math.floor(hashScale(hashL(md5(path)))))]);
							}							
						} else if (qDimUser[i].choice == "single"){
							colors = colors.concat(typeof qDimUser[i].single === "object" ? qDimUser[i].single.color : qDimUser[i].single);
						} else if (qDimUser[i].choice == "expression" && typeof d[i].qAttrExps.qValues !== "undefined" && d[i].qAttrExps.qValues.length >= 0 && typeof d[i].qAttrExps.qValues[0].qText !== "undefined") {
							colors = colors.concat(d[i].qAttrExps.qValues[0].qText);
						} else {
							colors = colors.concat("#888888"); //may happen if expression fails
						}						
					}	

					// what color should the flow be
					if (qFlowUser.auto==true || qFlowUser.choice == "random"){
						//strValue = d[i].qText;
						if (qFlowUser.displayPalette === "D3-20") {
							var colours = ['#1f77b4','#aec7e8','#ff7f0e','#ffbb78','#2ca02c','#98df8a','#d62728','#ff9896','#9467bd','#c5b0d5','#8c564b',
											'#c49c94','#e377c2','#f7b6d2','#7f7f7f','#c7c7c7','#bcbd22','#dbdb8d','#17becf','#9edae5' ];
						}
						else if (qFlowUser.displayPalette === "D3-20b") {
							var colours = ['#393b79','#5254a3','#6b6ecf','#9c9ede','#637939','#8ca252','#b5cf6b','#cedb9c','#8c6d31','#bd9e39',
							'#e7ba52','#e7cb94','#843c39','#ad494a','#d6616b','#e7969c','#7b4173','#a55194','#ce6dbd','#de9ed6'];
						}
						else if (qFlowUser.displayPalette === "D3-20c") {
							var colours = ['#3182bd','#6baed6',	'#9ecae1','#c6dbef','#e6550d','#fd8d3c','#fdae6b','#fdd0a2','#31a354',
								'#74c476','#a1d99b','#c7e9c0','#756bb1','#9e9ac8','#bcbddc','#dadaeb','#636363','#969696','#bdbdbd','#d9d9d9' ];
						}
						else if (qFlowUser.displayPalette === "20") {
							var colours = [ '#1abc9c','#7f8c8d','#2ecc71','#bdc3c7','#3498db','#c0392b','#9b59b6','#d35400','#34495e','#f39c12',
								'#16a085','#95a5a6','#27ae60','#ecf0f1','#2980b9','#e74c3c','#8e44ad','#e67e22','#2c3e50','#f1c40f' ];
						}
						else if (qFlowUser.displayPalette === "20a") {
							var colours = [ '#023FA5','#7D87B9','#BEC1D4','#D6BCC0','#BB7784','#FFFFFF','#4A6FE3','#8595E1','#B5BBE3','#E6AFB9',
							'#E07B91','#D33F6A','#11C638','#8DD593','#C6DEC7','#EAD3C6','#F0B98D','#EF9708','#0FCFC0','#9CDED6'];
						}			
						if (qFlowUser.auto==true || !qFlowUser.colorPersistence){
							flowColor = colours[Math.floor(Math.random() * (19))];
						} else {
							flowColor = colours[parseInt(Math.floor(hashScale(hashL(md5(path)))))];
						}							
					} else if (qFlowUser.choice == "single"){
						flowColor = typeof qFlowUser.single === "object" ? qFlowUser.single.color : qFlowUser.single;
					} else if (qFlowUser.choice == "expression" && typeof d[finalIndex].qText !== "undefined") {
						flowColor = d[finalIndex].qText;
					} else {
						flowColor = "#888888"; //may happen if expression fails
					}				
						
					// needed if statements here to check whether there is a flow color expression		
					if (nbMesures == 4 && !qFlowUser.auto && qFlowUser.choice == "expression"){
						return {
							"Colors": colors,
							"FlowColor": flowColor,
							"Path": path,
							"Frequency": d[nbDimension].qNum,
							"Photogauche": d[nbTotal-2].qText,
							"Photodroite": d[nbTotal-1].qText
							}
					} else if (nbMesures == 3 && !qFlowUser.auto && qFlowUser.choice == "expression"){	
						return {
							"Color": colors,
							"FlowColor": flowColor,
							"Path": path,
							"Frequency": d[nbDimension].qNum,
							"Photogauche": d[nbTotal-1].qText
						}
					} else if (nbMesures == 3 && qFlowUser.choice != "expression"){	
						return {
							"Colors": colors,
							"FlowColor": flowColor,
							"Path": path,
							"Frequency": d[nbDimension].qNum,
							"Photogauche": d[nbTotal-2].qText,
							"Photodroite": d[nbTotal-1].qText
						}
					} else if (nbMesures == 2 && qFlowUser.choice != "expression"){	
						return {
							"Color": colors,
							"FlowColor": flowColor,
							"Path": path,
							"Frequency": d[nbDimension].qNum,
							"Photogauche": d[nbTotal-1].qText
						}
					} else {	
						return {
							"Color": colors,
							"FlowColor": flowColor,
							"Path": path,
							"Frequency": d[nbDimension].qNum
						}
					}					
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
			  	var sNodes = [];
			  	var jNodes = [];
			  	var rev = 0; //permet de pivoter les dimensions
			  
			 
			  	source=source.slice(0,maxHeight);
			  	//source foreach
				source.forEach(function(d) {
			 		//var row = d;
				  	var path = d.Path;
				  	var val = parseFloat(d.Frequency);
				  	if(val > 0) {
						var tArr = path.split(separator);  
						var colors = d.Color;
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
								if ($.inArray(this.toString().trim(), sNodes) === -1) {
									sNodes.push(this.toString().trim());
									jNodes.push({name: this.toString().trim(),
												 color: colors[i]});
								}
							});
						}
					}
				});

				//source foreach
				source.forEach(function(d) {
				  	//var row = d;
				  	var path = d.Path
				  	var val = parseFloat(d.Frequency);
				  	var flowColor = d.FlowColor;
				  
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

									//////console.info(cT + " " + cS);
									$.each(sLinks, function(i, v) {
										if ((v.source === cS) && (v.target === cT)) {
											////console.info(this);
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
											"FlowColor": flowColor
										});
									}
									if ((tFlag == "no") &&  (useMeasure == false)) {
										sLinks.push({
											"source" : cS,
											"target" : cT,
											"value" : val,
											"FlowColor": flowColor
										});
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
				  top : 1,
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
				
				//Color of Flow 
				//link.style('stroke', flowColor);


				$('.ttip').remove(); //We make sure there isn't any other tooltip div in the doom

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
										nameImage = d.sourceLinks[0].Photogauche;
									}
									if (position != 0 && imageRight == true) { //pour le dernier c'est toujours photodroite
										nameImage = d.targetLinks[0].Photodroite;
									}
									
								}
								else { //on utilise les dimensions
									if ((imageLeft == true && position == 0) || (imageRight == true && position == qDim.length -1 ) ){
										nameImage = d.name.substring(0, d.name.indexOf("~")).split('|')[0];
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
						
					/*
					 function dragmove(d) {
					  d3.select(this).attr("transform", "translate(" + d.x + "," + (d.y = Math.max(0, Math.min(height - d.dy, d3.event.y))) + ")");
					  sankey.relayout();
					  link.attr("d", path);
					}
					*/
			}        
		};
} );