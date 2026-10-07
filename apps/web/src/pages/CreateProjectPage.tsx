import "./CreateProjectPage.css";

function CreateProjectPage() {
  return (
    <section className="create-project">
      <h1>Nuevo proyecto</h1>

      <p className="create-project-hint">
        Los campos marcados con <span aria-hidden="true">*</span> son
        obligatorios.
      </p>

      <form className="create-project-form">
        <div className="field">
          <label htmlFor="name">
            Nombre{" "}
            <span className="required" aria-hidden="true">
              *
            </span>
          </label>
          <input id="name" name="name" type="text" required />
        </div>

        <div className="field">
          <label htmlFor="description">Descripción</label>
          <textarea id="description" name="description" rows={4} />
        </div>

        <div className="actions">
          <button type="submit" className="btn-primary">
            Guardar
          </button>
        </div>
      </form>
    </section>
  );
}

export default CreateProjectPage;
