
//var d3 = Plotly.d3;
var WIDTH_IN_PERCENT_OF_PARENT = 90;
var HEIGHT_IN_PERCENT_OF_PARENT = 90;
var HEIGHT = 400;
	//Constants for the SVG
	var width = 850,
	height = 800,
	radius = 7,
	chartWidth = 850,
	chartHeight = 800;

	//Set up scale for nodes
node_scale = d3.scaleLinear();

d3.selectAll('.flag').style('top','-30px').style('left','-30px');

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
	  .attr("width", chartWidth)
	  .attr("height", chartHeight)
		.attr("rx", 5)
		.attr("ry",5)
    .style("fill", "url(#gradient)");


	d3.json("charts.json" ,function(charts) {


	console.log(charts);
	//add date to navbar
	d3.select("#date").text(charts.time.formatted);


		
//get graph data from charts
var graph = charts.media_graph;

var simulation = d3.forceSimulation()
	.force("collide",d3.forceCollide( function(d){return d.r + 100 }).iterations(16) )
	.force("charge", d3.forceManyBody().theta(1.2))
	.force("center", d3.forceCenter(chartWidth / 2, chartHeight / 2))
	.force("link", d3.forceLink(graph.edges).distance(180))



//get list of degrees
degrees = graph.nodes.map(function(d) {return d.degree});

//bookend scale
node_scale.domain([d3.min(degrees),d3.max(degrees)]).range([5,35])
							


var link = svg.append("g")
	.attr("class", "links")
	.selectAll("line")
	.data(graph.links)
	.enter()
	.append("line")
	.style("stroke-width", function (d) {
		return Math.sqrt(d.value);
	})
	.attr("stroke", "#D3D3D3");

var node = svg.append("g")
.attr("class", "nodes")
.selectAll("circle")
.data(graph.nodes)
.enter().append("g")
.on("click", connectedNodes)
.call(d3.drag()
		.on("start", dragstarted)
		.on("drag", dragged)
		.on("end", dragended));


node.append("circle")
.attr("r", function(d){   return node_scale(d.degree); })
.style("fill", function (d) {
	if (d.group == "media") {
		return "white";
	} else {
	//	return "#8B0830";
		return "#7e1fdc";
	}
})

	


node.append("text")
		.text(function(d) { return d.name })
		.attr("x", 10)
		.attr("y", 5)
		.style("fill", "#04002b");

		// node.append("title")
		// .text(function(d) { return d.name; });		
	
	simulation
			.nodes(graph.nodes)
			.on("tick", ticked);

	 simulation.force("link")
	 		.links(graph.links);

			function dragstarted(d) {
				if (!d3.event.active) simulation.alphaTarget(0.3).restart();
				d.fx = d.x;
				d.fy = d.y;
		}
		
		function dragged(d) {
				d.fx = d3.event.x;
				d.fy = d3.event.y;
		}
		
		function dragended(d) {
				if (!d3.event.active) simulation.alphaTarget(0);
				d.fx = null;
				d.fy = null;
		}



	//Now we are giving the SVGs co-ordinates - the force layout is generating the co-ordinates which this code is using to update the attributes of the SVG elements
	function ticked() {

		node.attr("transform", function(d) {
			d.x = Math.max(radius, Math.min(chartWidth - radius, d.x));
			d.y = Math.max(radius, Math.min(chartHeight - radius, d.y));
			return "translate(" + d.x + "," + d.y + ")";
	});
	// node
	// .attr("cx", function(d) { return d.x = Math.max(radius, Math.min(width - radius, d.x)); })
	// .attr("cy", function(d) { return d.y = Math.max(radius, Math.min(height - radius, d.y)); });

		link
			.attr("x1", function (d) {return d.source.x;})
			.attr("y1", function (d) {return d.source.y;})
			.attr("x2", function (d) {return d.target.x;})
			.attr("y2", function (d) {return d.target.y;});
	};


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

	//Use Barchart
	var troll_data = []
	for(var key in charts.trolls){
				if(charts.trolls.hasOwnProperty(key))
				{
						troll_data.push({
								key: key,
								value: charts.trolls[key]
						});
				}
		}

	
		var barChart = BarChart()
			.gradient_color({"start":"#647DEE","stop":"#7F53AC"});
		
		d3.select('#trolls')
			.datum(troll_data)
			.call(barChart);
});
