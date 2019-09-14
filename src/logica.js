/* 
 * Este script define a função calculate() chamada pelas rotinas de tratamento de evento
 * no código HTML acima. A função lê valores de elementos <input>, calcula
 * as informações de pagamento de empréstimo, exibe o resultado em elementos <span>.
 * Também salva os dados do usuário, exibe links para financeiras e desenha um gráfico.
 */
function calculate() {
    // Pesquisa elementos de entrada e saída no documento
    var mount = document.getElementById("amount");
    var apr = document.getElementById("apr");
    var years = document.getElementById("years");
    var zipcode = document.getElementById("zipcoce");
    var payment = document.getElementById("payment");
    var total = document.getElementById("total");
    var totalinterest = document.getElementById("totalinterest");

    // Obtém a entrada do usuário através dos elementos de entrada. Presume que tudo isso é valido.
    //Converte os juros de porcetagem para decimais e converte taxa
    //anual para taxa mensal. Converte o período de pagamento em anos
    //para o número de pagamentos mensais.
    var principal = parseFloat(amount.value);
    var interest = parseFloat(apr.value) / 100 / 12;
    var payments = parseFloat(years.value) * 12;

    // Agora calula o valor do pagamento mensal.
    var x = Math.pow(1 + interest, payments); // Math.pow() calcula potências
    var monthly = (principal * x * interest) / (x - 1);

    //Se o resultado é um número finito, a entrada do usuário estava correta e 
    // temos resultados significativos para exibir
    if (isFinite(monthly)) {
        //  Preenche os campos de saída, arredondando para 2 casas decimais 
        payment.innerHTML = monthly.toFixed(2);
        total.innerHTML = (monthly * payments).toFixed(2);
        totalinterest.innerHTML = ((monthly * payments) - principal).toFixed(2);

        // Salva a entrada do usuário para que possamos recuperá-la na próxima vez que
        // ele visitar
        save(amount.value, apr.value, years.value, zipcode.value);

        // Anúncio: localiza e exibe financeiras locais, mais ignora erros de rede
        try { // Captura quaisquer erros que ocorram dentro destas chaves
            getLenders(amount.value, apr.value, years.value, zipcode.value);
        } catch (e) { /* E ignora esses erros */ }

        // Por fim, traça o gráfico do saldo devedor, dos juros e dos pagamentos do capital
        chart(principal, interest, monthly, payments);
    } else {
        // O resultado foi Not-a-Number ou infinito, o que significa que a entrada 
        // estava incompleta ou era inválida. Apaga qualquer saída exibida anteriormente.
        payment.innerHTML = ""; // Apaga o conteúdo desses elementos
        total.innerHTML = ""
        totalinterest.innerHTML = "";
        chart(); // Sem argumentos, apaga o gráfico
    }
}

// Salva a entrada do usuário como propriedades do objeto localStorage. Essas
// Propriedades ainda existirão quando o usuário visitar no futuro
// Esse recurso de armazenamento não vai funcionar em alguns navegadores (o Firefox, por 
// exemplo), se você executar o exemplo a partir de um arquivo local:// URL. Contudo,
// funciona com HTTP.
function save(amount, apr, years, zipcode) {
    if (window.localStorage) { // So faz isso se o navegador suportar
        localStorage.loan_amount = amount;
        localStorage.loan_apr = apr;
        localStorage.loan_years = years;
        localStorage.loan_zipcode = zipcode;
    }
}

// Tenta restaurar  os campos de entrada automaticamente quando o ducumento é carregado
// pela primeira vez.
window.onload = function() {
    // Se o navegador suporta localStorage e temos alguns dados armazenados 
    if (window.localStorage && localStorage.loan_amount) {
        document.getElementById("amount").value = localStorage.loan_amount;
        document.getElementById("apr").value = localStorage.loan_apr;
        document.getElementById("year").value = localStorage.loan_years;
        document.getElementById("zipcode").value = localStorage.loan_zipcode;
    }
}

// Passa a entrada do usuário para um script no lado do servidor que (teoricamente) pode
// retornar
// uma lista de links para financeiras locais interessadas em fazer empréstimos. Este
// exemplo não contém uma implementação real desse serviço de busca de financeiras. Mas
//  se o serviço existisse, essa função funcionaria com ele.
function getLenders(amount, apr, years, zipcode) {
    // Se o navegador não suporta o objeto XMLHttpRequest, não faz nada
    if (!window.XMLHttpRequest) return;
    // Localiza o elemento para exibir a lista de financeiras
    var ad = document.getElementById("lenders");
    if (!ad) return; // Encerra se não há ponto de saída
    // Codifica a entrada do usuário como parâmetros de consulta em um URL
    var url = "getLenders.php" + // Url do serviço mais 
        "?amt=" + encodeURIComponent(amount) + //dados do usuário na string
        // de consulta
        "&apr=" + encodeURIComponent(apr) +
        "&yrs=" + encodeURIComponent(years) +
        "&zip=" + encodeURIComponent(zipcode);
    // Busca o conteúdo  dese URL usando o objeto XMLHttpRequest
    var req = new XMLHttpRequest(); // Inicia um novo pedido
    req.open("GET", url); // Envia um pedido GET da HTTP para o url
    req.send(null); // Envia o pedido sem corpo

    // Antes de retornar, registra uma função de rotina de tratamento de evento que será
    // Chamada em um momento posterior, quando a resposta do servidor de HTTP chegar.
    // Esse tipo de programação assíncrona é muito comum em JavaScript do lado do 
    // cliente
    req.onreadystatechange = function() {
        if (req.readyState == 4 && req.status == 200) {
            // Se chegamos até aqui, obtivemos uma resposta HTTP válida e completa
            var response = req.responseText; // Resposta HTTP como string
            var lenders = JSON.parse(response); // Analisa em um array JS

            // Converte o array de objetos lender em uma string HTML
            var list = "";
            for (var i = 0; i < lenders.length; i++) {
                list += "<li><a href='" + lenders[i].url + "'>" +
                    lenders[i].name + "</a>";
            }

            // Exibe o código HTML no elemento acima.
            ad.innerHTML = "<ul>" + list + "</ul>";
        }
    }

}

// Faz o gráfico do saldo devedor mensal, dos juros do capital em um elemento <canvas>
// da HTML.
// Se for chamado sem argumentos, basta apagar qualquer gráfico desenhado anteriormente.
function chart(principal, interest, monthly, payments) {
    var graph = document.getElementById("graph"); // Obtém a marca <canvas>
    graph.width = graph.width; // Mágica para apagar e redefinir o elemento
    // canvas
    // Se chamamos sem argumentos ou se esse navegador não suporta
    // elementos gráficos em um elemento <canvas>, basta retornar agora.
    if (arguments.length == 0 || !graph.getContext) return;

    // Obtém objeto "contexto" de <canvas> que define a API de desenho
    var g = graph.getContext("2d"); // Todo desenho é feito com esse objeto
    var width = graph.width,
        height = graph.height; //Obtém o tamanho da tela de 
    // desenho

}