var d3 = Plotly.d3;
var WIDTH_IN_PERCENT_OF_PARENT = 90;
var HEIGHT_IN_PERCENT_OF_PARENT = 90;
var HEIGHT = 400;

d3.json("/charts.json" ,function(charts) {
	console.log(charts)
	//make d3 selections into html
	var graph = d3.select('#media-graph');
	var top_hashtags = d3.select('#top-hashtags');
	var trending_hashtags = d3.select('#trending-hashtags');
	var top_urls = d3.select('#top-urls');
	var trending_urls = d3.select('#trending-urls');
	var top_nouns = d3.select('#top-nouns');
	var trending_nouns = d3.select('#trending-nouns');
	var tweeting_frequency = d3.select('#tweeting-freq');
	var sentiment_pie = d3.select('#sentiment-pie');

	function make_node(d3_selection) {

			var target = d3_selection.append('div').style({
					width: WIDTH_IN_PERCENT_OF_PARENT + '%',
					'margin-left':(100 - WIDTH_IN_PERCENT_OF_PARENT)/2 + '%',

//					height: HEIGHT_IN_PERCENT_OF_PARENT + 'vh',
//					'margin-top':(100 - HEIGHT_IN_PERCENT_OF_PARENT)/2 + 'vh',
					height: HEIGHT + 'px',
					'margin-top': (HEIGHT * .07) + 'px'
				})
			return target.node();
		};
	//make nodes that apply margins
	var top_hashtags_node = make_node(top_hashtags);
	var trending_hashtags_node = make_node(trending_hashtags);
	var top_urls_node = make_node(top_urls);
	var trending_urls_node = make_node(trending_urls);
	var top_nouns_node = make_node(top_nouns);
	var trending_nouns_node = make_node(trending_nouns);
	var tweeting_frequency_node = make_node(tweeting_frequency);
	var sentiment_pie_node = make_node(sentiment_pie);

	var graph_node = graph.node();

//function to make row chart data takes row chart dict adds plotly stuff to it
	function row_chart_data(dict) {
		var data = [{
			type:'bar',
			x:dict.values.reverse(),
			y:dict.labels.reverse(),
			orientation: 'h',
			marker:{
				color: 'rgb(24,227,172)',
				width: 1
			}
		}]
		return data;

	}
	function bar_chart_data(dict) {
		var data = [{
			type:'bar',
			x:dict.labels,
			y:dict.values,
			marker:{
				color: 'rgb(24,227,172)',
				width: 1
			}
		}]
		return data;

	}

	function pie_chart_data(dict){
		var data = [{
			type:'pie',
			labels: dict.labels,
			values: dict.values,
			marker: {
				colors:['rgb(24,227,172)','rgb(255,109,27)','rgb(41,126,227)']
			}
		}];
		return data;
	}
	function make_trending_data(dict,titleArray){
		var data = {}
		data["labelHeading"] = titleArray[0]
		data["valueHeading"] = titleArray[1]
		data["items"] = []
		for (i=0; i < dict.values.length; i++){
			data.items.push({label: dict.labels[i],value: dict.values[i]})
		}
		return data

	}

	//make row chart data
	var top_hashtags_data = row_chart_data(charts.top_hashtags);
	var trending_hashtags_data = row_chart_data(charts.trending_hashtags);

	var top_urls_data = row_chart_data(charts.top_urls);
	var trending_urls_data = row_chart_data(charts.trending_urls);
	var top_nouns_data = row_chart_data(charts.top_nouns);
	var trending_nouns_data = row_chart_data(charts.trending_nouns);
	var tweeting_frequency_data = bar_chart_data(charts.tweeting_freqs);

	//make pie chart data
	var sentiment_pie_data = pie_chart_data(charts.sentiment_pie)
	function color_code_media(check) {
		 if (media_sources.indexOf(check) > -1) {
			return "rgb(243,23,23)"
		}
		else {
			return "rgb(24,227,172)"
		}

	}


	function graph_data(dict) {


		function map_markers(markers) {
				scale = d3.scale.linear();
				new_scaled_data = [];
				scale.domain([d3.min(markers), d3.max(markers)]).range([5,20]);
				for (i=0; i < markers.length; i++) {
					new_scaled_data[i] = scale(markers[i]);
				}

				return new_scaled_data;
			}

			var nodes = dict.nodes
			var edges = dict.edges
			colors = Array.from(nodes.text, color_code_media);

			var trace1 = {
				x:nodes.x,
				y:nodes.y,
				z:nodes.z,
				mode:"markers+text",
				text:nodes.text,
				marker:{
					color:colors,
					size:map_markers(nodes.marker)
				},
				type:"scatter3d"
			}
			var data = []
			for (var key in edges) {
				if (!edges.hasOwnProperty(key)) continue;
					var edge = edges[key];
					edge.type = 'scatter3d'
					edge.mode = 'lines'
					edge.opacity = 0.8
					edge.line = {color:'rgb(170,170,170)'}
					data.push(edge);
				}
			data.push(trace1);
			return data;
		}


	var axis_legend_att = {
			title:'',
			showgrid:false,
			ticks:'',
			zeroline:false,
			showticklabels:false,
			autotick:false,
			ticks:''
		}

	var graph_layout = {
		showlegend: false,
		autosize: true,
		scene:{
			xaxis: axis_legend_att,
			yaxis: axis_legend_att,
			zaxis: axis_legend_att
		},
	}
	var barchart_layout = {
		autosize:true

	}

	titlefont = {
		family:"Helvetic Neue, sans-serif",
		size:25,
		color:'#333'
	}
	barchart_layout.titlefont = titlefont;
	var tweeting_frequency_layout = {};
	tweeting_frequency_layout.title= "Tweets last week";
	tweeting_frequency_layout.titlefont = titlefont;
	var sentiment_pie_layout = {};
	sentiment_pie_layout.title = "Sentiment of tweets last week";
	sentiment_pie_layout.titlefont = titlefont;
	graph_layout.title = "Network Graph of media shared in #WhiteHelmets conversation"
	graph_layout.titlefont = titlefont;
	graph_data = graph_data(charts.media_graph)

	Plotly.plot(graph_node,graph_data,graph_layout);
	barchart_layout.title="Top Hashtags"
	Plotly.plot(top_hashtags_node,top_hashtags_data,barchart_layout);

	var source = $("#trending-table").html();
	var template = Handlebars.compile(source);
//	barchart_layout.title="Trending Hashtags"
//	Plotly.plot(trending_hashtags_node,trending_hashtags_data,barchart_layout);


	$('#trending-hashtags').children().append(template(make_trending_data(charts.trending_hashtags,["Hashtags","% increase"])));


	barchart_layout.title="Top Domains"
	Plotly.plot(top_urls_node,top_urls_data,barchart_layout);
//	barchart_layout.title="Trending Domains"
//	Plotly.plot(trending_urls_node,trending_urls_data,barchart_layout);
$('#trending-urls').children().append(template(make_trending_data(charts.trending_urls,["URL's","% increase"])));
	barchart_layout.title="Top Nouns"
	Plotly.plot(top_nouns_node,top_nouns_data,barchart_layout);
//	barchart_layout.title="Trending Nouns"
//	Plotly.plot(trending_nouns_node,trending_nouns_data,barchart_layout);
$('#trending-nouns').children().append(template(make_trending_data(charts.trending_nouns,["Nouns","% increase"])));

	Plotly.plot(sentiment_pie_node,sentiment_pie_data,sentiment_pie_layout);
	Plotly.plot(tweeting_frequency_node,tweeting_frequency_data, tweeting_frequency_layout);

	window.addEventListener('resize',function() {Plotly.Plots.resize(graph_node);})
	window.addEventListener('resize',function() {Plotly.Plots.resize(top_hashtags_node);})

//	window.addEventListener('resize',function() {Plotly.Plots.resize(trending_hashtags_node);})

	window.addEventListener('resize',function() {Plotly.Plots.resize(top_urls_node);})
//	window.addEventListener('resize',function() {Plotly.Plots.resize(trending_urls_node);})
	window.addEventListener('resize',function() {Plotly.Plots.resize(top_nouns_node);})
//	window.addEventListener('resize',function() {Plotly.Plots.resize(trending_nouns_node);})
	window.addEventListener('resize',function() {Plotly.Plots.resize(sentiment_pie_node);})
	window.addEventListener('resize',function() {Plotly.Plots.resize(tweeting_frequency_node);})

});
