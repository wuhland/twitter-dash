// Using Mike Bostock's Towards Reusable Charts Pattern
function BarChart() {
console.log("barchart")
  // All options that should be accessible to caller
  var width = 1600;
  var height = 900;
  var barPadding = 1;
  var fillColor = 'white';
  var gradient_color = {"start":"#E58C8A","stop":"#EEC0C6"}
  var margin = {top: 75, right: 100, bottom: 75, left: 350}; 
 

  function chart(selection){
    var html_id = selection.attr("id");
   
  


      selection.each(function (data) {
          console.log(data)

        var svgContainer = d3.select(this).append('svg')
            .attr("viewBox", "0 0 " + width  + " " + height)
            .attr("preserveAspectRatio", "xMidYMid meet");

        //chart sizes = total size minus margins
        var chartWidth = width - margin.left - margin.right;
        var chartHeight = height - margin.top - margin.bottom;
            

           	// define gradient for svg
        var gradient = svgContainer.append("defs")
            .append("linearGradient")
                .attr("id", html_id + "grad")
                .attr("x1", "0%")
                .attr("y1", "0%")
                .attr("x2", "100%")
                .attr("y2", "100%")
                .attr("spreadMethod", "pad");

            gradient.append("stop")
                .attr("offset", "0%")
                .attr("stop-color", gradient_color.start)
                .attr("stop-opacity", 1);

            gradient.append("stop")
                .attr("offset", "100%")
                .attr("stop-color", gradient_color.stop)
                .attr("stop-opacity", 1);
                
            svgContainer.append('rect')
                .attr("width", width)
                .attr("height", height)
                .attr("rx", 5)
                .attr("ry",5)
                .style("fill", 'url(#'+ html_id + 'grad)');
       
        var values = data.map(function(x){return x.value;})
        var names = data.map(function(x){return x.key;}) 

        var xScale = d3.scaleLinear()
                            .domain([0,d3.max(values)])
                            .range([0,chartWidth]);

        var yScale = d3.scaleBand()
                .domain(names)
                .range([0, chartHeight])
                .paddingInner(0.3);

         var barwidth = yScale.bandwidth();

        //this is the chart that will go on the colored background
        var viz =  svgContainer.append("g")
                 .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            
                  // mapps variables allong y axis
        var yAxis = d3.axisLeft()
                  .scale(yScale);

        var yaxis = viz.append('g')
                      .classed('y axis', true)
                      .call(customYAxis);

        var xAxis = d3.axisBottom()
                    .scale(xScale)
                    .tickSize(-chartHeight);
    
        var xaxis = viz.append('g')
                    .classed('x axis', true)
                    .attr("transform", "translate(0," + (chartHeight + 20) + ")")
                    .call(customXAxis);
            
        
        console.log(barwidth)
          var bars = viz.selectAll('rect')
              .data(data)
              .enter()
              .append('rect')
              .classed('bar',true)
              .attr('y', function (d) {return yScale(d.key) })
              .attr('height', barwidth)
              .style('fill', fillColor)
              .attr('x',0)
              .attr('width', function (d) {return xScale(d.value)})
              .style('fill', fillColor);
              
        var axisText = barwidth/2.75
        function customYAxis(g) {
                g.call(yAxis);
                g.select(".domain").remove();
                g.selectAll(".tick line").attr("stroke", "#777").attr("stroke-dasharray", "2,2");
                g.selectAll(".tick text")
                        .attr("x", -barwidth*1.2)
                        .attr("font-size", barwidth/2.75 + "px")
                        .attr("fill","white")
                        .attr("font-weight","bold");
                g.selectAll(".tick").insert("g")
                g.selectAll(".tick g").append("svg:image")
                        .attr("id",function(d) {return d })
                       .attr("xlink:href", function (d) { return 'https://avatars.io/twitter/' + d  + '/Small'; })
                       .attr("width", barwidth)
                       .attr("height", barwidth)
                       .attr("transform","translate(" + -barwidth*1.1 + "," + -barwidth/2 + ")");
        }      

        function customXAxis(g) {
            g.call(xAxis);
            g.select('.domain').remove();
            g.selectAll(".tick line").attr("stroke", "#777").attr("stroke-dasharray", "2,2");
            g.selectAll(".tick text").attr("font-size", barwidth/2.75 + "px")
                    .attr("fill","white")
                    .attr("font-weight","bold")
        
        }


      });
  }

  chart.width = function(value) {
      if (!arguments.length) return margin;
      width = value;
      return chart;
  };

  chart.height = function(value) {
      if (!arguments.length) return height;
      height = value;
      return chart;
  };

  chart.barPadding = function(value) {
      if (!arguments.length) return barPadding;
      barPadding = value;
      return chart;
  };

  chart.fillColor = function(value) {
      if (!arguments.length) return fillColor;
      fillColor = value;
      return chart;
  };
  chart.gradient_color = function(value) {
    if (!arguments.length) return gradient_color;
    gradient_color = value;
    return chart;
};

  return chart;
}
