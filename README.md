# SenseColorableSankey
Qlik Sense Colorable Sankey Extension

Developed by Jonathan Vitale - School District of Philadelphia

Display data with Sankey diagram, whose nodes and links can be colored by dimension expressions.
Typically used to visualize cost, energy or flows between processes. Helpful in locating dominant contributions to an overall flow. 
The size of each flow is calculated by the value in the first measure.

The extension is based on :

An updated Sense Sankey developed by Xavier Le Pitre, 
forked from the original Sense Sankey diagram by John Park
based on D3.js

The updated Sankey chart extension, developed by Xavier Le Pitre : <a href="http://branch.qlik.com/#!/project/568aa0b06ed0f0f47a89d7f2">here</a><br>
Original Sankey extension, developped by John Park : <a href="http://branch.qlik.com/#/project/56728f52d1e497241ae697c5">here</a><br>
Mike Bostock's Sankey chart : <a href="http://bost.ocks.org/mike/sankey">here</a><br>
D3.js

TODO: Check how the images work with measures.

v0.4: Provide link and node options to eliminate text and have minimum size.
v0.3: Flow color is now determined at the dimension level. Will hide dimensions with missing data. Exports to image.
v0.2: Can now sort on dimensions. Assign dimension values a numeric value - choose ascending or descending.
V0.1: Can color dimensions by expression. This is used to color the nodes. Retains options from original. Also color flow by expression.
This creates a new measure under the surface solely dedicated to coloring flows. Have not tested with images.

License

Please, if you update this extension feel free to send me your pull requests to help others users to enjoy all features!

Troubleshooting (taken from Xavier's version)
If you install Qlik Sense and the Extensions as instructed but get the error “Invalid Visualization”, it most likely is because Qlik Sense occasionally has problems with its cache. To resolve this issue you need to clear the browser cache, but how you do that depends on how you run Qlik Sense.

Below you will find a short step by step guide on how to clear the cache depending on how you run Qlik Sense desktop. Terminology may differ between languages but the functionality should be the same.

<b>The Desktop Application</b>

Navigate to the app you are having problems with.
Hold Ctrl+Shift and right click anywhere in the app.
Click the “Show DevTools” option.
Once the DevTools tab is open you will find a tab called “Network”, located between “Elements” and “Sources”. Click it.
On the very top of the “Network” tab you will find the check box “Disable Cache”. Check it if not already checked.
Now, navigate back to the app you were having problems with and hit F5 to refresh.
If you have the same problem with other apps just repeat the process with that app.

<b>Google Chrome</b>

Navigate to the app you are having problems with.
Press F12 or Ctrl+Shift+j to open the developer tools.
Once the developer tools page is open you will find a tab called “Network”. It will be between “Elements” and “Sources”. Click it.
On the very top of the “Network” tab you will find the check box “Disable Cache”. Check it if not already checked.
Hit F5 to refresh.
You can now close the developer tools by pressing F12 again.

If you have the same problem with other apps, just repeat the process with that app.

<b>Firefox</b>

Navigate to the app you are having problems with.
Press F12 to open the developer tools.
Once the developer tools page is open you will find an icon that looks like a small cogwheel. It is located in the top-right corner of the developer tools. Click it.
Look for a check box labeled “Disable Cache”. Check it if not already checked.
Hit F5 to refresh.
You can now close the developer tools by pressing F12 again.

If you have the same problem with other apps, just repeat the process with that app.

<b>Internet Explorer</b>

This is for Internet Explorer 9, but the steps for Internet Explorer 10 and 11 is most likely very similar.

Navigate to the Menu Button (the one looking like a small cogwheel) and click it.
Navigate to the “Safety” option and click the “Delete Browsing History” button.
Uncheck everything except “Preserve Favorites website data” and “Temporary Internet files”.
Press Delete.
Hit F5 to refresh.
If you have the same problem with other apps, just repeat the process with that app.

Once an app is working the cache should not be a problem again.

The MIT License (MIT)

Copyright (c) 2017 Jonathan Michael Vitale

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
