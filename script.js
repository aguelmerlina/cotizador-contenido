const WEBAPP_URL="https://script.google.com/macros/s/AKfycbyh8i30Eo5zl0i52Xrt1CkXI3gcAfAcEl9cD_eeHpj62sW7qRH5MHHe3hN_OqhRycE93w/exec";

const tarifas = {
  reel: {
    edicion: 18000,
    produccion: 28000,
    integral: 35000
  },
  carrusel: {
    edicion: 15000,
    produccion: 22000,
    integral: 28000
  },
  historias: {
    edicion: 10000,
    produccion: 15000,
    integral: 18000
  }
};

const descuentos = {
  1: 1,
  2: 0.95,
  3: 0.92,
  4: 0.90,
  5: 0.88,
  6: 0.85,
  7: 0.83,
  8: 0.80,
  9: 0.78,
  10: 0.75
};

const porcentaje = {
  1: 0,
  2: 5,
  3: 8,
  4: 10,
  5: 12,
  6: 15,
  7: 17,
  8: 20,
  9: 22,
  10: 25
};

const nTrabajo = {
  reel: "Reel",
  carrusel: "Carrusel",
  historias: "Pack Historias (Hasta 5)"
};

const nTipo = {
  edicion: "Edición solamente",
  produccion: "Producción y Grabación + Edición",
  integral: "Idea y Guión + Producción y Grabación + Edición"
};

const items = [];

const $ = id => document.getElementById(id);

const dinero = n =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0
  }).format(Math.round(n));

function calc(item) {
  return tarifas[item.trabajo][item.tipo] * item.cantidad * descuentos[item.cantidad];
}

/* ==========================
   ENVIAR REGISTRO POR MAIL
========================== */

async function enviarRegistro(){

  if(!items.length) return "0000";

  const detalle =
`Fecha: ${new Date().toLocaleString("es-AR")}

${items.map(item =>
`${item.cantidad} ${nTrabajo[item.trabajo]} — ${nTipo[item.tipo]}`
).join("\n")}

Total: ${$("total").textContent}`;

  const data = new URLSearchParams();
  data.append("detalle",detalle);

  try{

    const respuesta = await fetch(WEBAPP_URL,{
      method:"POST",
      body:data
    });

    const json = await respuesta.json();

    return json.numero;

  }catch(error){

    console.error(error);
    return "0000";

  }

}

/* ==========================
   ACORDEONES
========================== */

function inicializarAcordeon(id) {
  const acordeon = $(id);
  if (!acordeon) return;

  const boton = acordeon.querySelector(".accordion-header");
  if (!boton) return;

  boton.addEventListener("click", () => {
    acordeon.classList.toggle("active");
  });
}

inicializarAcordeon("descuentosAccordion");
inicializarAcordeon("glosarioAccordion");

/* ==========================
   RENDER
========================== */

function render() {

  let total = 0;
  let reels = 0;
  let carruseles = 0;
  let historias = 0;

  if (!items.length) {

    $("lista").innerHTML =
      '<div class="empty">Todavía no agregaste trabajos.</div>';

    $("total").textContent = dinero(0);
    $("reels").textContent = dinero(0);
    $("carruseles").textContent = dinero(0);
    $("historias").textContent = dinero(0);

    return;
  }

  $("lista").innerHTML = items.map((item, index) => {

    item.total = calc(item);

    total += item.total;

    if (item.trabajo === "reel") reels += item.total;
    if (item.trabajo === "carrusel") carruseles += item.total;
    if (item.trabajo === "historias") historias += item.total;

    return `
      <div class="item">

        <div>

          <strong>${item.cantidad} ${nTrabajo[item.trabajo]}</strong><br>

          <small>${nTipo[item.tipo]}</small>

          ${
            item.cantidad > 1
              ? `<span class="discount-tag">✓ Descuento aplicado: ${porcentaje[item.cantidad]}%</span>`
              : ""
          }

        </div>

        <div class="item-right">

          <strong>${dinero(item.total)}</strong>

          <button class="delete-btn"
            onclick="eliminarItem(${index})"
            title="Eliminar">
            🗑
          </button>

        </div>

      </div>
    `;

  }).join("");

  $("total").textContent = dinero(total);
  $("reels").textContent = dinero(reels);
  $("carruseles").textContent = dinero(carruseles);
  $("historias").textContent = dinero(historias);
}

/* ==========================
   ELIMINAR ITEM
========================== */

window.eliminarItem = index => {
  items.splice(index, 1);
  render();
};

/* ==========================
   AGREGAR SERVICIO
========================== */

$("agregar").onclick = () => {

  const trabajo = $("trabajo").value;
  const tipo = $("tipo").value;

  if (!trabajo || !tipo) {
    alert("Completá el trabajo y el tipo de servicio.");
    return;
  }

  let cantidad = Math.max(
    1,
    Math.min(10, +$("cantidad").value || 1)
  );

  const existente = items.find(
    item => item.trabajo === trabajo && item.tipo === tipo
  );

  if (existente) {
    existente.cantidad = Math.min(10, existente.cantidad + cantidad);
  } else {
    items.push({
      trabajo,
      tipo,
      cantidad
    });
  }

  $("trabajo").selectedIndex = 0;
  $("tipo").selectedIndex = 0;
  $("cantidad").value = 1;

  render();
};

/* ==========================
   REINICIAR
========================== */

$("reiniciar").onclick = () => {
  items.length = 0;
  render();
};

/* ==========================
   COPIAR PRESUPUESTO
========================== */

$("copiar").onclick = () => {

  let suma = 0;

  const texto = items.map(item => {

    item.total = calc(item);
    suma += item.total;

    return `${item.cantidad} ${nTrabajo[item.trabajo]} — ${nTipo[item.tipo]}: ${dinero(item.total)}`;

  }).join("\n") + `

TOTAL DEL PROYECTO: ${dinero(suma)}`;

  navigator.clipboard.writeText(texto);

};
  
/* ==========================
   EXPORTAR PDF
========================== */

$("pdf").onclick=async()=>{

  if (!items.length) return;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Obtener el número correlativo desde Google Apps Script
  const numeroCotizacion = await enviarRegistro();

  let y = 24;
  let suma = 0;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(159, 73, 164);

  doc.text("Merlina Aguel", 20, y);

  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(40);

  doc.text("Producción y Edición de Contenido", 20, y);

  y += 10;

  doc.setFontSize(10);
  doc.setTextColor(120);

  doc.text(
    "Fecha: " + new Date().toLocaleDateString("es-AR"),
    20,
    y
  );

  y += 6;

  doc.text(
    "Cotización Nº " + numeroCotizacion,
    20,
    y
  );

  y += 12;

  doc.line(20, y, 190, y);

  y += 10;

  items.forEach(item => {

    item.total = calc(item);
    suma += item.total;

    doc.setFont("helvetica", "bold");
    doc.text(`${item.cantidad} ${nTrabajo[item.trabajo]}`, 20, y);

    y += 6;

    doc.setFont("helvetica", "normal");
    doc.text(nTipo[item.tipo], 20, y);

    doc.text(dinero(item.total), 190, y, {
      align: "right"
    });

    y += 10;

    if (y > 260) {
      doc.addPage();
      y = 20;
    }

  });

  doc.line(20, y, 190, y);

  y += 12;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(159, 73, 164);

  doc.text("Total del proyecto", 20, y);

  doc.text(dinero(suma), 190, y, {
    align: "right"
  });

  y += 18;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(120);

  doc.text(
    "Este presupuesto es orientativo y puede ajustarse según el alcance del proyecto.",
    20,
    y,
    { maxWidth: 170 }
  );

  doc.save(`Presupuesto-${numeroCotizacion}.pdf`);

  };

/* ==========================
   INICIALIZACIÓN
========================== */

render();
