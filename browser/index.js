var apiClient = require('./api-client');
var serialize = require('form-serialize');

exports.autoInitForms = function(){
	var formsWrappers = document.querySelectorAll('.wapi-form-wrapper');

	formsWrappers.forEach(function(formWrapper){
		var form = formWrapper.querySelector('.wapi-form');
		var formDone = formWrapper.querySelector('.wapi-form-done');
		var formFail = formWrapper.querySelector('.wapi-form-fail');
		var formName =  formWrapper.getAttribute('data-form-name');


		form.addEventListener('submit',function(e){
			e.preventDefault();

			var obj = serialize(e.target, { hash: true });
			var files = {};

			for (var elementIndex = 0; elementIndex < e.target.elements.length; elementIndex++) {
				var element = e.target.elements[elementIndex];
				var elementName = element.name;
				
				if (element.type === 'file' && elementName !== '') {
					for (var fileIndex = 0; fileIndex < element.files.length; fileIndex++) {
					var file = element.files[fileIndex];
					var fileName = elementName + "-" + fileIndex;
					files[fileName] = file;
				}
				}
			}

      return apiClient.submitForm({
				name:formName,
				body:obj,
            	files:files
			}).then(function(){
				formDone.style.display = 'block';
				form.style.display = 'none';
			}).catch(function(){
				formDone.style.display = 'block';
				form.style.display = 'none';
			});


		})
	});
}

exports.apiClient = apiClient;

window.wapi = module.exports;
