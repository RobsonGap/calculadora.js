/* 
 * Este script define a função calculate() chamada pelas rotinas de tratamento de evento
 * no código HTML acima. A função lê valores de elementos <input>, calcula
 * as informações de pagamento de empréstimo, exibe o resultado em elementos <span>.
 * Também salva os dados do usuário, exibe links para financeiras e desenha um gráfico.
 */
function calculate() {
    // Pesquisa elementos de entrada e saída no documento
    var amount = document.getElementById("amount");
    var apr = document.getElementById("apr");
    var years = document.getElementById("years");
    var zipcode = document.getElementById("zipcode");
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
        document.getElementById("years").value = localStorage.loan_years;
        document.getElementById("zipcode").value = localStorage.loan_zipcode;
    }
};

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
    var graph = document.getElementById("graph"); // Get the <canvas> tag
    graph.width = graph.width; // Magic to clear and reset the canvas element

    // If we're called with no arguments, or if this browser does not support
    // graphics in a <canvas> element, then just return now.
    if (arguments.length == 0 || !graph.getContext) return;

    // Get the "context" object for the <canvas> that defines the drawing API
    var g = graph.getContext("2d"); // All drawing is done with this object
    var width = graph.width,
        height = graph.height; // Get canvas size

    // These functions convert payment numbers and dollar amounts to pixels
    function paymentToX(n) { return n * width / payments; }

    function amountToY(a) { return height - (a * height / (monthly * payments * 1.05)); }

    // Payments are a straight line from (0,0) to (payments, monthly*payments)
    g.moveTo(paymentToX(0), amountToY(0)); // Start at lower left
    g.lineTo(paymentToX(payments), // Draw to upper right
        amountToY(monthly * payments));
    g.lineTo(paymentToX(payments), amountToY(0)); // Down to lower right
    g.closePath(); // And back to start
    g.fillStyle = "#f88"; // Light red
    g.fill(); // Fill the triangle
    g.font = "bold 12px sans-serif"; // Define a font
    g.fillText("Total Interest Payments", 20, 20); // Draw text in legend

    // Cumulative equity is non-linear and trickier to chart
    var equity = 0;
    g.beginPath(); // Begin a new shape
    g.moveTo(paymentToX(0), amountToY(0)); // starting at lower-left
    for (var p = 1; p <= payments; p++) {
        // For each payment, figure out how much is interest
        var thisMonthsInterest = (principal - equity) * interest;
        equity += (monthly - thisMonthsInterest); // The rest goes to equity
        g.lineTo(paymentToX(p), amountToY(equity)); // Line to this point
    }
    g.lineTo(paymentToX(payments), amountToY(0)); // Line back to X axis
    g.closePath(); // And back to start point
    g.fillStyle = "green"; // Now use green paint
    g.fill(); // And fill area under curve
    g.fillText("Total Equity", 20, 35); // Label it in green

    // Loop again, as above, but chart loan balance as a thick black line
    var bal = principal;
    g.beginPath();
    g.moveTo(paymentToX(0), amountToY(bal));
    for (var p = 1; p <= payments; p++) {
        var thisMonthsInterest = bal * interest;
        bal -= (monthly - thisMonthsInterest); // The rest goes to equity
        g.lineTo(paymentToX(p), amountToY(bal)); // Draw line to this point
    }
    g.lineWidth = 3; // Use a thick line
    g.stroke(); // Draw the balance curve
    g.fillStyle = "black"; // Switch to black text
    g.fillText("Loan Balance", 20, 50); // Legend entry

    // Now make yearly tick marks and year numbers on X axis
    g.textAlign = "center"; // Center text over ticks
    var y = amountToY(0); // Y coordinate of X axis
    for (var year = 1; year * 12 <= payments; year++) { // For each year
        var x = paymentToX(year * 12); // Compute tick position
        g.fillRect(x - 0.5, y - 3, 1, 3); // Draw the tick
        if (year == 1) g.fillText("Year", x, y - 5); // Label the axis
        if (year % 5 == 0 && year * 12 !== payments) // Number every 5 years
            g.fillText(String(year), x, y - 5);
    }

    // Mark payment amounts along the right edge
    g.textAlign = "right"; // Right-justify text
    g.textBaseline = "middle"; // Center it vertically
    var ticks = [monthly * payments, principal]; // The two points we'll mark
    var rightEdge = paymentToX(payments); // X coordinate of Y axis
    for (var i = 0; i < ticks.length; i++) { // For each of the 2 points
        var y = amountToY(ticks[i]); // Compute Y position of tick
        g.fillRect(rightEdge - 3, y - 0.5, 3, 1); // Draw the tick mark
        g.fillText(String(ticks[i].toFixed(0)), // And label it.
            rightEdge - 5, y);
    }
}