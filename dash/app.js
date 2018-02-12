
//var d3 = Plotly.d3;
var WIDTH_IN_PERCENT_OF_PARENT = 90;
var HEIGHT_IN_PERCENT_OF_PARENT = 90;
var HEIGHT = 400;
d3.selectAll('.flag').style('top','-30px').style('left','-30px');
d3.json("charts.json" ,function(charts) {
	console.log(charts);
	//add date to navbar
	d3.select("#date").text(charts.time.formatted);

	//make d3 selections into html
//	var graph = d3.select('#media-graph');
	var top_hashtags = d3.select('#top-hashtags');
	var trending_hashtags = d3.select('#trending-hashtags');
	var top_urls = d3.select('#top-urls');
	var trending_urls = d3.select('#trending-urls');
	var top_nouns = d3.select('#top-nouns');
	var trending_nouns = d3.select('#trending-nouns');
	var tweeting_frequency = d3.select('#tweeting-freq');
	var sentiment_pie = d3.select('#sentiment-pie');

	//Constants for the SVG
var width = 850,
    height = 400,
		radius = 7;

//Set up the force layout
var force = d3.layout.force()
		.gravity(.1)
    .charge(-200)
    .linkDistance(210)
    .size([width, height]);

	//Append a SVG to the body of the html page. Assign this SVG as an object to svg
	var svg = d3.select("#media-graph").append("svg")
							.attr("id", "playgraph")
            	.attr("viewBox", "0 0 " + width + " " + height )
            	.attr("preserveAspectRatio", "xMidYMid meet");

// define gradient for svg
	var gradient = svg.append("defs")
	  .append("linearGradient")
	    .attr("id", "gradient")
	    .attr("x1", "0%")
	    .attr("y1", "0%")
	    .attr("x2", "100%")
	    .attr("y2", "100%")
	    .attr("spreadMethod", "pad");

	gradient.append("stop")
	    .attr("offset", "0%")
	    .attr("stop-color", "#FCE38A")
	    .attr("stop-opacity", 1);

	gradient.append("stop")
	    .attr("offset", "100%")
	    .attr("stop-color", "#F38181")
	    .attr("stop-opacity", 1);

	svg.append("rect")
	  .attr("width", width)
	  .attr("height", height)
		.attr("rx", 5)
		.attr("ry",5)
    .style("fill", "url(#gradient)");
	console.log(charts);
	//Read the data from the mis element
	//var mis = document.getElementById('mis').innerHTML;

	//get graph data from charts
	var graph = charts.media_graph;

	//Set up scale for nodes
	node_scale = d3.scale.linear();
	//get list of degrees
  degrees = graph.nodes.map(function(d) {return d.degree});
	//bookend scale
	node_scale.domain([d3.min(degrees),d3.max(degrees)]).range([5,35])
	//Creates the graph data structure out of the json data
	force.nodes(graph.nodes)
	    .links(graph.links)
	    .start();

	//Create all the line svgs but without locations yet
	var link = svg.selectAll(".link")
	    .data(graph.links)
	    .enter().append("line")
	    .attr("class", "link")
	    .style("stroke-width", function (d) {
	    		return Math.sqrt(d.value);
			});
	//Do the same with the circles for the nodes - no
	var node = svg.selectAll(".node")
	    .data(graph.nodes)
	    .enter().append("g")
	    .attr("class", "node")
	    .call(force.drag)
			.on('click', connectedNodes)

	node.append("circle")
    .attr("r", function(d) { return node_scale(d.degree);})
    .style("fill", function (d) {
				if (d.group == "media") {
					return "white";
				} else {
				//	return "#8B0830";
					return "#7e1fdc";
				}
});
	node.append("text")
	      .attr("dx", 10)
	      .attr("dy", ".35em")
	      .text(function(d) { return d.name })
	      .style("fill", "#04002b");

	//Now we are giving the SVGs co-ordinates - the force layout is generating the co-ordinates which this code is using to update the attributes of the SVG elements
	force.on("tick", function () {

			d3.selectAll("circle").attr("cx", function (d) {
        //return d.x = Math.max(radius, Math.min(width - radius, d.x));
				return d.x;
    })
        .attr("cy", function (d) {
      //  return d.y = Math.max(radius, Math.min(height - radius, d.y));
				return d.y;
    });

		d3.selectAll("text").attr("x", function (d) {
			//	return d.x = Math.max(radius, Math.min(width - radius, d.x));
				return d.x;
 			})
		 .attr("y", function (d) {
			//	return d.y = Math.max(radius, Math.min(height - radius, d.y));
		 		return d.y;
 			});
	    node.attr("cx", function (d) {
	    //    return d.x = Math.max(radius, Math.min(width - radius, d.x));
					return d.x;
	    })
	        .attr("cy", function (d) {
	      //  	return d.y = Math.max(radius, Math.min(height - radius, d.y));
						return d.y;
	    });
			node.each(collide(0.5));
			link.attr("x1", function (d) {
					return d.source.x;
			})
					.attr("y1", function (d) {
					return d.source.y;
			})
					.attr("x2", function (d) {
					return d.target.x;
			})
					.attr("y2", function (d) {
					return d.target.y;
			});
	});
	var padding = 1; // separation between circles
	function collide(alpha) {
	  var quadtree = d3.geom.quadtree(graph.nodes);
	  return function(d) {
	    var rb = 2*radius + padding,
	        nx1 = d.x - rb,
	        nx2 = d.x + rb,
	        ny1 = d.y - rb,
	        ny2 = d.y + rb;
	    quadtree.visit(function(quad, x1, y1, x2, y2) {
	      if (quad.point && (quad.point !== d)) {
	        var x = d.x - quad.point.x,
	            y = d.y - quad.point.y,
	            l = Math.sqrt(x * x + y * y);
	          if (l < rb) {
	          l = (l - rb) / l * alpha;
	          d.x -= x *= l;
	          d.y -= y *= l;
	          quad.point.x += x;
	          quad.point.y += y;
	        }
	      }
	      return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
	    });
	  };
	}
	//Toggle stores whether the highlighting is on
	var toggle = 0;
	//Create an array logging what is connected to what
	var linkedByIndex = {};
	for (i = 0; i < graph.nodes.length; i++) {
	    linkedByIndex[i + "," + i] = 1;
	};

	graph.links.forEach(function (d) {
	    linkedByIndex[d.source.index + "," + d.target.index] = 1;
	});
	//This function looks up whether a pair are neighbours
	function neighboring(a, b) {
	    return linkedByIndex[a.index + "," + b.index];
	};
	function updateConnectedTable(clicked,connected) {
		var selected = d3.select(".selected");
		selected.select("table").remove();

		var table = d3.select(".selected").append("table");
		var header = table.append("thead").append("tr");

		header
			.selectAll("th")
			.data(["URL","Connections"])
			.enter()
			.append("th")
			.text(function(d){return d;});

		var tablebody = table.append("tbody");
		var rows = tablebody
			.selectAll("tr")
			.data(connected.map(function(d){return [d.name,d.degree, d.group]}))
			.enter()
			.append("tr")
			.attr("class",function(d){return d[2] == "alt" ? "danger":null });

		var cells = rows
				.selectAll("td")
				.data(function(d){return [d[0],d[1]];})
				.enter()
				.append("td")
				.text(function(d){return d});

		var explainer = d3.select(".explainer")
}
	//function to animate flag on screen and then off again
	var move_flag = function () {
		var ease = d3.easeElastic;
		d3.selectAll(".flag")
			.filter(".putin")
			.transition()
			.ease(ease)
			.duration(1000)
			.style("top","0px").style("left","0px")
			.transition().delay(3000).style("top","-40px").style("left","-40px");

			d3.selectAll(".flag")
				.filter(".bg")
				.transition()
				.duration(500)
				.style("top","0px").style("left","0px")
				.transition().delay(3000).style("top","-40px").style("left","-40px");

	};

	function connectedNodes() {
	    if (toggle == 0) {

	        //Reduce the opacity of all but the neighbouring nodes
	        d = d3.select(this).node().__data__;
					if (d.group == 'alt') {
							move_flag();
					}
	        node.style("opacity", function (o) {
	            return neighboring(d, o) | neighboring(o, d) ? 1 : 0.1;
	        });
					//get list of urls d is linked to
					var connected = node.filter(function(o){return neighboring(d,o) | neighboring(o,d) });
					//get connected data from connected and sort descending by degree
					connected = connected.data().sort(function(a,b){return d3.descending(a.degree,b.degree)});
					var clicked = d.name;
					updateConnectedTable(clicked,connected)

	        link.style("opacity", function (o) {
	            return d.index==o.source.index | d.index==o.target.index ? 1 : 0.1;
	        });
					//toggle opacity of divs
							d3.selectAll(".inner").transition().duration(400).style("opacity",function() { return d3.select(this).style("opacity") > .5 ? 0 : 1});


	        //Reduce the op
	        toggle = 1;
	    } else {
				//toggle opacity of divs
				d3.selectAll(".inner").transition().duration(400).style("opacity",function() {return d3.select(this).style("opacity") > .5 ? 0 : 1});

	        //Put them back to opacity=1
	        node.style("opacity", 1);
	        link.style("opacity", 1);
	        toggle = 0;
	    }


	};

// 	function make_node(d3_selection) {
//
// 			var target = d3_selection.append('div').style({
// 					width: WIDTH_IN_PERCENT_OF_PARENT + '%',
// 					'margin-left':(100 - WIDTH_IN_PERCENT_OF_PARENT)/2 + '%',
// 					height: HEIGHT + 'px',
// 					'margin-top': (HEIGHT * .07) + 'px'
// 				})
// 			return target.node();
// 		};
// 	//make nodes that apply margins
// 	var top_hashtags_node = make_node(top_hashtags);
// 	var trending_hashtags_node = make_node(trending_hashtags);
// 	var top_urls_node = make_node(top_urls);
// 	var trending_urls_node = make_node(trending_urls);
// 	var top_nouns_node = make_node(top_nouns);
// 	var trending_nouns_node = make_node(trending_nouns);
// 	var tweeting_frequency_node = make_node(tweeting_frequency);
// 	var sentiment_pie_node = make_node(sentiment_pie);
//
// //	var graph_node = graph.node();
//
// //function to make row chart data takes row chart dict adds plotly stuff to it
// 	function row_chart_data(dict) {
// 		var data = [{
// 			type:'bar',
// 			x:dict.values.reverse(),
// 			y:dict.labels.reverse(),
// 			orientation: 'h',
// 			marker:{
// 				color: 'rgb(24,227,172)',
// 				width: 1
// 			}
// 		}]
// 		return data;
//
// 	}
// 	function bar_chart_data(dict) {
// 		var data = [{
// 			type:'bar',
// 			x:dict.labels,
// 			y:dict.values,
// 			marker:{
// 				color: 'rgb(24,227,172)',
// 				width: 1
// 			}
// 		}]
// 		return data;
//
// 	}
//
// 	function pie_chart_data(dict){
// 		var data = [{
// 			type:'pie',
// 			labels: dict.labels,
// 			values: dict.values,
// 			marker: {
// 				colors:['rgb(24,227,172)','rgb(255,109,27)','rgb(41,126,227)']
// 			}
// 		}];
// 		return data;
// 	}
// 	function make_trending_data(dict,titleArray){
// 		var data = {}
// 		data["title"] = titleArray[0]
// 		data["labelHeading"] = titleArray[1]
// 		data["valueHeading"] = titleArray[2]
// 		data["items"] = []
//
// 		for (i=dict.values.length-1; i >= 0; i--){
// 			data.items.push({label: dict.labels[i],value: dict.values[i]})
// 		}
// 		return data
//
// 	}
//
// 	//make row chart data
// 	var top_hashtags_data = row_chart_data(charts.top_hashtags);
// 	var trending_hashtags_data = row_chart_data(charts.trending_hashtags);
//
// 	var top_urls_data = row_chart_data(charts.top_urls);
// 	var trending_urls_data = row_chart_data(charts.trending_urls);
// 	var top_nouns_data = row_chart_data(charts.top_nouns);
// 	var trending_nouns_data = row_chart_data(charts.trending_nouns);
// 	var tweeting_frequency_data = bar_chart_data(charts.tweeting_freqs);
// 	console.log(tweeting_frequency_data)
//
// 	//make pie chart data
// 	var sentiment_pie_data = pie_chart_data(charts.sentiment_pie)
//
// 	function color_code_media(check) {
// 		 if (media_sources.indexOf(check) > -1) {
// 			return "rgb(243,23,23)"
// 		}
// 		else {
// 			return "rgb(24,227,172)"
// 		}
//
// 	}
//
//
// 	function graph_data(dict) {
//
//
// 		function map_markers(markers) {
// 				scale = d3.scale.linear();
// 				new_scaled_data = [];
// 				scale.domain([d3.min(markers), d3.max(markers)]).range([5,20]);
// 				for (i=0; i < markers.length; i++) {
// 					new_scaled_data[i] = scale(markers[i]);
// 				}
//
// 				return new_scaled_data;
// 			}
//
// 			var nodes_alt = dict.nodes_alt;
// 			var nodes_source = dict.nodes_source;
// 			var edges = dict.edges;
// 	//		colors = Array.from(nodes.text, color_code_media);
// 	//	colors = '#fffff'
//
// 			var trace1 = {
// 				name:"Fake News Media",
// 				showlegend:true,
// 				x:nodes_alt.x,
// 				y:nodes_alt.y,
// 				z:nodes_alt.z,
// 				mode:"markers+text",
// 				text:nodes_alt.text,
//
// 				marker:{
// 					color:"red",
// 					size:map_markers(nodes_alt.marker),
// 				},
// 				hoverinfo:"text",
// 				type:"scatter3d"
// 			}
//
// 			var trace2 = {
// 				name:"Website",
// 				showlegend:true,
// 				x:nodes_source.x,
// 				y:nodes_source.y,
// 				z:nodes_source.z,
// 				mode:"markers+text",
// 				text:nodes_source.text,
//
// 				marker:{
// 					color:"rgb(24,227,172)",
// 					size:map_markers(nodes_source.marker),
//
//
//
// 				},
// 				hoverinfo:"text",
// 				type:"scatter3d"
// 			}
// 			var data = []
//
// 			for (var key in edges) {
// 				if (!edges.hasOwnProperty(key)) continue;
// 					var edge = edges[key];
// 					edge.type = 'scatter3d'
// 					edge.hoverinfo = 'skip'
// 					edge.showlegend = false
// 					edge.mode = 'lines'
// 					edge.opacity = 0.8
// 					edge.line = {color:'rgb(170,170,170)'}
// 					data.push(edge);
// 				}
// 			data.push(trace1);
// 			data.push(trace2);
// 			return data;
// 		}
//
//
//
// 	var axis_legend_att = {
// 			title:'',
// 			showgrid:false,
// 			ticks:'',
// 			zeroline:false,
// 			showline:false,
// 			showticklabels:false,
// 			showspikes:false,
// 			ticks:''
// 		}
//
// 	var graph_layout = {
// 		autosize: true,
// 		scene:{
// 			xaxis: axis_legend_att,
// 			yaxis: axis_legend_att,
// 			zaxis: axis_legend_att
// 		},
// 	}
// 	var barchart_layout = {
// 		autosize:true,
// 		margin: {
// 			pad: 4,
// 			r:15,
// 			l:130,
// 		}
//
// 	}
//
// 	titlefont = {
// 		family:"Helvetic Neue, sans-serif",
// 		size:25,
// 		color:'#333'
// 	}
// 	barchart_layout.titlefont = titlefont;
// 	var tweeting_frequency_layout = {};
// 	tweeting_frequency_layout.title= "Tweets last week";
// 	tweeting_frequency_layout.titlefont = titlefont;
// 	var sentiment_pie_layout = {};
// 	sentiment_pie_layout.title = "Tweet Sentiment";
// 	sentiment_pie_layout.titlefont = titlefont;
// 	graph_layout.title = "Network Graph of Media Shared in #WhiteHelmets Conversation"
// 	graph_layout.titlefont = titlefont;
// //	graph_data = graph_data(charts.media_graph)
//
// 	//modebar buttons to remove
// 	var basicChartOptions = {modeBarButtonsToRemove: ['select2d','sendDataToCloud','lasso2d','hoverClosestCartesian','hoverCompareCartesian'],displaylogo:false};
//
// 	//Plotly.plot(graph_node,graph_data,graph_layout,basicChartOptions);
//
//
// 	var hashtag_layout = Object.assign({},barchart_layout);
// 	hashtag_layout.title= "Top Hashtags";
// 	Plotly.plot(top_hashtags_node,top_hashtags_data,hashtag_layout,basicChartOptions);
//
// 	var source = $("#trending-table").html();
// 	var template = Handlebars.compile(source);
// //	barchart_layout.title="Trending Hashtags"
// //	Plotly.plot(trending_hashtags_node,trending_hashtags_data,barchart_layout);
//
//
// 	$('#trending-hashtags').children().append(template(make_trending_data(charts.trending_hashtags,["Trending Hashtags","Hashtag","% increase"])));
//
//
//
// 	var domain_layout = Object.assign({}, barchart_layout);
// 	domain_layout.title="Top Domains";
// 	Plotly.plot(top_urls_node,top_urls_data,domain_layout,basicChartOptions);
// //	barchart_layout.title="Trending Domains"
// //	Plotly.plot(trending_urls_node,trending_urls_data,barchart_layout);
// $('#trending-urls').children().append(template(make_trending_data(charts.trending_urls,["Trending Domains","URL","% increase"])));
//
//
// 	var nouns_layout = Object.assign({},barchart_layout);
// 	nouns_layout.title = "Top Nouns";
// 	Plotly.plot(top_nouns_node,top_nouns_data, nouns_layout ,basicChartOptions);
// //	barchart_layout.title="Trending Nouns"
// //	Plotly.plot(trending_nouns_node,trending_nouns_data,barchart_layout);
// $('#trending-nouns').children().append(template(make_trending_data(charts.trending_nouns,["Trending Noun Phrases","Noun","% increase"])));
//
// 	Plotly.plot(sentiment_pie_node,sentiment_pie_data,sentiment_pie_layout,basicChartOptions);
// 	Plotly.plot(tweeting_frequency_node,tweeting_frequency_data, tweeting_frequency_layout,basicChartOptions);
//
// //	window.addEventListener('resize',function() {Plotly.Plots.resize(graph_node);})
// 	window.addEventListener('resize',function() {Plotly.Plots.resize(top_hashtags_node);})
//
// //	window.addEventListener('resize',function() {Plotly.Plots.resize(trending_hashtags_node);})
//
// 	window.addEventListener('resize',function() {Plotly.Plots.resize(top_urls_node);})
// //	window.addEventListener('resize',function() {Plotly.Plots.resize(trending_urls_node);})
// 	window.addEventListener('resize',function() {Plotly.Plots.resize(top_nouns_node);})
// //	window.addEventListener('resize',function() {Plotly.Plots.resize(trending_nouns_node);})
// 	window.addEventListener('resize',function() {Plotly.Plots.resize(sentiment_pie_node);})
// 	window.addEventListener('resize',function() {Plotly.Plots.resize(tweeting_frequency_node);})
//
});
