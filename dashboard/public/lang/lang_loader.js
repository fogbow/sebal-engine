(function init(){

	var default_lang = 0;
	
	var langAvailable = [
		{
			langName:"English",
			langShortName:"Eng",
			img:"lang-icon-usa.png",
			content:{
				login:{
					placeholdName:"NAME/EMAIL",
					placeholdEmail:"PASSWORD",
					buttonEnter:"Enter",
					forgotPassword:"Forgot your password?",
					createAccount:"Create new Account",
				},
				createAccount:{
					title:"Create Account",
					labels:{
						name:"Name",
						email:"E-mail",
						password:"Password",
						confirmPassword:"Confirm password",
					},
					buttons:{
						create:"Create Account",
					},
				},
				navbar:{
					menu:{
						submission:"Submissions",
						map:"Map",
						help:"Help",
						logout:"Logout",
					}
				},
				heatMap:{
					label:"Number of processed images",
					infoTo:"to",
				},
				mapFeature:{
					searchBox:{
						title:"Search",
						label:{
							generalSearch:"Find an area or TAG",
							detailSearch:"Detailed search",
							region:"Region",
							firstDate:"First Year",
							lastDate:"Last Year",
							sapsVersion:"SAPS Version",
							sapsTag:"SAPS  Tag",
							satellite:"Satellites",
						},
						button:{
							clear:"Clear search",
							search:"Search",
						},
						raioButton:{
							default:"Default",
							other:"Other",
						}
					},
					submissionBox:{
						title:"New Submission",
						label:{
							submissionName:"Submission Name",
							submissionTags:"Tags",
							firstDate:"First Year",
							lastDate:"Last Year",
							region:"Region",
							sapsVersion:"SAPS Version",
							sapsTag:"SAPS  Tag",
							satellite:"Satellites",
							requiredField:"Required Field",
						},
						button:{
							submit:"Submit",
						},
						raioButton:{
							default:"Default",
							other:"Other",
						}
					},
					regionDetailBox:{
						title:"Region details",
						label:{
							regionName:"Region",
						},
					},
				},
				infos:{
					regionSearchFilter:{
						info:"For add more regions use \";\".",
						eg:"Eg: region1;region2",
					}
				},
				submissionsList:{
					steps:{
						title:"Steps until download completion",
						downloading:"Downloading",
						downloaded:"Downloaded",
						queued:"Queued",
						fetched:"Fetched",
					},
					button:{
						newSubmission:"New submission"
					},
					table:{
						columnName:"Name",
						columnCreationDate:"Creation date",
						columnEndDate:"End date",
						columnState:"State",
					},
				},
			},
		},
		{
			langName:"Portugues (Brasil)",
			langShortName:"Pt-br",
			img:"lang-icon-br.png",
			content:{
				login:{
					placeholdName:"NOME/EMAIL",
					placeholdEmail:"SENHA",
					buttonEnter:"Entrar",
					forgotPassword:"Esqueceu sua senha?",
					createAccount:"Criar nova Conta",
				},
				createAccount:{
					title:"Criar Conta",
					labels:{
						name:"Nome",
						email:"E-mail",
						password:"Senha",
						confirmPassword:"Confirmar senha",
					},
					buttons:{
						create:"Criar Conta",
					},
				},
				navbar:{
					menu:{
						submission:"Submissões",
						map:"Mapa",
						help:"Ajuda",
						logout:"Sair",
					}
				},
				heatMap:{
					label:"Número de imagens processadas",
					infoTo:"a",
				},
				mapFeature:{
					searchBox:{
						title:"Pesquisar",
						label:{
							generalSearch:"Encontre uma área ou TAG",
							detailSearch:"Pesquisa detalhada",
							region:"Região",
							firstDate:"Data inicial",
							lastDate:"Data final",
							sapsVersion:"Versão do SAPS",
							sapsTag:"TAG do SAPS",
							satellite:"Satelites",
						},
						button:{
							clear:"Limpar persquisa",
							search:"Pesquisar",
						},
						raioButton:{
							default:"Pardão",
							other:"Outro",
						}
					},
					submissionBox:{
						title:"Nova Submissão",
						label:{
							submissionName:"Nome da Submissão",
							submissionTags:"Tags",
							firstDate:"Data inicial",
							lastDate:"Data final",
							region:"Região",
							sapsVersion:"Versão do SAPS",
							sapsTag:"TAG do SAPS",
							satellite:"Satelites",
							requiredField:"Campo Requerido",
						},
						button:{
							submit:"Enviar",
						},
						raioButton:{
							default:"Pardão",
							other:"Outro",
						}
					},
					regionDetailBox:{
						title:"Detalhes da Região",
						label:{
							regionName:"Área",
						},
					},
				},
				infos:{
					regionSearchFilter:{
						info:"Para acresentar mais de uma região acrescente \";\".",
						eg:"Ex: região1;região2",
					},
				},
				submissionsList:{
					steps:{
						title:"Passos ate odownload ser completo",
						downloading:"Baixando",
						downloaded:"Baixado",
						queued:"Enfileirado",
						fetched:"Processado",
					},
					button:{
						newSubmission:"Nova submissão"
					},
					table:{
						columnName:"Nome",
						columnCreationDate:"Data de criação",
						columnEndDate:"Data de finalização",
						columnState:"Estado",
					},
				}
			},
		}
	]

	var getLangAvailables = function(){
		var langs = [];
		langAvailable.forEach(function(lang, index){
			langs.push({
				langName:lang.langName,
				langShortName:lang.langShortName,
				img:lang.img
			})
		});
		return langs;
	}
	var getLangByName = function(name){
		var langFound = undefined;
		langAvailable.forEach(function(lang, index){
			if(name == lang.langName){
				langFound = lang;
			}
		});
		return langFound;
	}
	var getLangByShortName = function(shortName){
		var langFound = undefined;
		langAvailable.forEach(function(lang, index){
			if(shortName == lang.langShortName){
				langFound = lang;
			}
		});
		return langFound;
	}

	var getDefault = function(){
		
		return langAvailable[default_lang];
	}

	var langLoader = {
		getLangAvailables:getLangAvailables,
		getLangByName:getLangByName,
		getLangByShortName:getLangByShortName,
		getDefault:getDefault,
		defaultIndex:default_lang,
	}

	window.langLoader = langLoader;
}
)();