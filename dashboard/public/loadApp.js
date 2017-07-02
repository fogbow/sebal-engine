$(function(){
   $.when(
      $.getScript("/lang/"),
      $.getScript("/scirpt2"),
      $.getScript("/script3")
}).done(function(){
    // do stuff with the contents of my new script files
});