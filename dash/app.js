
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
	// var top_hashtags = d3.select('#top-hashtags');
	// var trending_hashtags = d3.select('#trending-hashtags');
	// var top_urls = d3.select('#top-urls');
	// var trending_urls = d3.select('#trending-urls');
	// var top_nouns = d3.select('#top-nouns');
	// var trending_nouns = d3.select('#trending-nouns');
	// var tweeting_frequency = d3.select('#tweeting-freq');
//var trolls = d3.select('#trolls');

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

	//BarChart defined
	function BarChart(){
	  var width,
	      height,
	      xScale = d3.scaleBand(),
	      yScale = d3.scaleLinear(),
	      x,
	      y,
	      margin = { top: 15, bottom: 20, left: 30, right: 20 },
	      xAxis = d3.axisBottom(xScale),
	      yAxis = d3.axisLeft(yScale);

	  function my(selection){

	    if(!x) throw new Error("Bar Chart x column must be defined.");
	    if(!y) throw new Error("Bar Chart y column must be defined.");
	    if(!width) throw new Error("Bar Chart width must be defined.");
	    if(!height) throw new Error("Bar Chart height must be defined.");

	    selection.each(function(data) {

	      var svg = d3.select(this)
	          .attr("width", width)
	          .attr("height", height);

	      var g = svg.selectAll("g")
	        .data([1]);
	      g = g.enter().append("g")
	        .merge(g)
	          .attr("transform",
	                "translate(" + margin.left + "," + margin.top +")");

	      var innerWidth = width - margin.left - margin.right;
	      var innerHeight = height - margin.top - margin.bottom;

	      xScale
	        .domain(data.map(function (d){ return d[x]; }))
	        .range([0, innerWidth]);

	      yScale
	        .domain([0, d3.max(data, function (d){ return d[y] })])
	        .range([innerHeight, 0]);

	      var xAxisG = g.selectAll(".x-axis").data([1]);
	      xAxisG.enter().append("g")
	          .attr("class", "x-axis")
	        .merge(xAxisG)
	          .attr("transform", "translate(0," + innerHeight +")")
	          .call(xAxis);

	      var yAxisG = g.selectAll(".y-axis").data([1]);
	      yAxisG.enter().append("g")
	          .attr("class", "y-axis")
	        .merge(yAxisG)
	          .call(yAxis);

	      var rects = g.selectAll("rect")
	        .data(data);
	      rects.exit().remove();
	      rects.enter().append("rect")
	        .merge(rects)
	          .attr("x", function (d){ return xScale(d[x]); })
	          .attr("y", function (d){ return yScale(d[y]); })
	          .attr("width", xScale.bandwidth())
	          .attr("height", function (d){
	            return innerHeight - yScale(d[y]);
	          });
	    });
	  }

	  my.x = function (_){
	    return arguments.length ? (x = _, my) : x;
	  };

	  my.y = function (_){
	    return arguments.length ? (y = _, my) : y;
	  };

	  my.width = function (_){
	    return arguments.length ? (width = _, my) : width;
	  };

	  my.height = function (_){
	    return arguments.length ? (height = _, my) : height;
	  };

	  my.padding = function (_){
	    return arguments.length ? (xScale.padding(_), my) : xScale.padding();
	  };

	  return my;
	}
	//End BarChart Definition

	//Use Barchart
	var troll_data = []
	for(var key in charts.trolls)
		{
				if(charts.trolls.hasOwnProperty(key))
				{
						troll_data.push({
								key: key,
								value: charts.trolls[key]
						});
				}
		}
		console.log(troll_data)
		var barChart = BarChart()
			.width(300)
			.height(900)
			.x("trolls")
			.y("times shared")
			.padding(0.3)
		d3.select('#trolls')
			.datum(troll_data)
			.call(barChart);



});
