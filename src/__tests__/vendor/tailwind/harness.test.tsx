import { renderSimple } from "./_tailwind";

afterEach(() => {
  jest.restoreAllMocks();
});

test("two renders in one millisecond each compile their own classes", async () => {
  jest.spyOn(Date, "now").mockReturnValue(0);

  expect(await renderSimple({ className: "left-0" })).toStrictEqual({
    props: { style: { left: 0 } },
  });
  expect(await renderSimple({ className: "left-1" })).toStrictEqual({
    props: { style: { left: 3.5 } },
  });
});
