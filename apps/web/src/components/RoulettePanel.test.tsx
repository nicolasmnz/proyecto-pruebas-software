import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";

import RoulettePanel from "./RoulettePanel";
import type { RouletteSlice } from "../utils/roulette";

// Ana 60 % · Beto 30 % · Carla 10 %
const slices: RouletteSlice[] = [
  {
    member: { id: "u1", name: "Ana" },
    pendingPoints: 0,
    probability: 0.6,
    percentage: 60,
  },
  {
    member: { id: "u2", name: "Beto" },
    pendingPoints: 1,
    probability: 0.3,
    percentage: 30,
  },
  {
    member: { id: "u3", name: "Carla" },
    pendingPoints: 5,
    probability: 0.1,
    percentage: 10,
  },
];

function renderPanel(random: () => number = () => 0) {
  const onAssign = vi.fn(async () => {});
  const onCancel = vi.fn();

  render(
    <RoulettePanel
      slices={slices}
      onAssign={onAssign}
      onCancel={onCancel}
      random={random}
    />,
  );

  return { onAssign, onCancel };
}

describe("RoulettePanel", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  test("antes de girar muestra el porcentaje de cada integrante", () => {
    renderPanel();

    const legend = screen.getByRole("list", {
      name: "Probabilidad de cada integrante",
    });

    expect(
      within(legend)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["Ana60 %", "Beto30 %", "Carla10 %"]);
    expect(screen.getByRole("status")).toHaveTextContent("");
  });

  test("al girar anuncia al elegido y permite asignarle la tarea", async () => {
    const user = userEvent.setup();
    // 0,75 cae en el sector de Beto (de 0,6 a 0,9)
    const { onAssign } = renderPanel(() => 0.75);

    await user.click(screen.getByRole("button", { name: "Girar" }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "La ruleta eligió a Beto.",
    );

    await user.click(screen.getByRole("button", { name: "Asignar a Beto" }));

    expect(onAssign).toHaveBeenCalledWith("u2");
  });

  test("volver a girar puede elegir a otra persona sin asignar nada", async () => {
    const user = userEvent.setup();
    const random = vi.fn().mockReturnValueOnce(0.1).mockReturnValueOnce(0.95);
    const { onAssign } = renderPanel(random);

    await user.click(screen.getByRole("button", { name: "Girar" }));

    expect(screen.getByRole("status")).toHaveTextContent("Ana");

    await user.click(screen.getByRole("button", { name: "Volver a girar" }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "La ruleta eligió a Carla.",
    );
    expect(onAssign).not.toHaveBeenCalled();
  });

  test("cancelar no asigna", async () => {
    const user = userEvent.setup();
    const { onAssign, onCancel } = renderPanel();

    await user.click(screen.getByRole("button", { name: "Girar" }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onAssign).not.toHaveBeenCalled();
  });

  test("si falla la asignación muestra el error y permite reintentar", async () => {
    const user = userEvent.setup();
    const onAssign = vi
      .fn()
      .mockRejectedValueOnce(new Error("assigneeId debe ser un miembro"));

    render(
      <RoulettePanel
        slices={slices}
        onAssign={onAssign}
        onCancel={() => {}}
        random={() => 0}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Girar" }));
    await user.click(screen.getByRole("button", { name: "Asignar a Ana" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "assigneeId debe ser un miembro",
    );
    expect(screen.getByRole("button", { name: "Asignar a Ana" })).toBeEnabled();
  });

  test("con animación muestra que gira y revela al elegido al detenerse", async () => {
    vi.useFakeTimers();
    // Sin reducción de movimiento la ruleta se anima
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: false })),
    );

    renderPanel(() => 0);

    act(() => {
      screen.getByRole("button", { name: "Girar" }).click();
    });

    expect(screen.getByRole("status")).toHaveTextContent("Girando…");
    expect(screen.getByRole("button", { name: "Girar" })).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(2400);
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      "La ruleta eligió a Ana.",
    );
  });
});
