import { BaseConfig } from "https://deno.land/x/ddc_vim@v6.0.0/types.ts";
import { ConfigArguments } from "https://deno.land/x/ddc_vim@v6.0.0/base/config.ts";

export class Config extends BaseConfig {
  // deno-lint-ignore require-await
  override async config(args: ConfigArguments): Promise<void> {
    args.contextBuilder.patchGlobal({
      ui: "pum",
      autoCompleteEvents: [
        "InsertEnter",
        "TextChangedI",
        "TextChangedP",
        "CmdlineEnter",
        "CmdlineChanged",
        "TextChangedT",
      ],
      sources: ["around", "rg", "file"],
      cmdlineSources: {
        ":": ["cmdline", "cmdline-history", "around"],
        "/": ["around"],
      },
      sourceOptions: {
        _: {
          ignoreCase: true,
          matchers: ["matcher_head"],
          sorters: ["sorter_rank"],
          timeout: 1000,
        },
        around: {
          mark: "around",
        },
        cmdline: {
          mark: "cmdline",
          forceCompletionPattern: "\\S/\\S*|\\.\\w*",
        },
        "cmdline-history": {
          mark: "history",
          sorters: [],
        },
        copilot: {
          mark: "cop",
          matchers: [],
          minAutoCompleteLength: 0,
          isVolatile: false,
        },
        codeium: {
          mark: "cod",
          matchers: ["matcher_length"],
          minAutoCompleteLength: 0,
          isVolatile: true,
        },
        file: {
          mark: "file",
          isVolatile: true,
          forceCompletionPattern: "\\S/\\S*",
        },
        "lsp": {
          mark: "lsp",
          //dup: "keep",
          //keywordPattern: "\k+",
          matchers: ["matcher_head"],
          sorters: ["sorter_lsp-kind"],
          converters: [],
          // matchers: ["matcher_fuzzy"],
          // sorters: ["sorter_fuzzy"],
          // converters: ["converter_fuzzy"],
          forceCompletionPattern: "\\.\\w*|::\\w*|->\\w*",
          // forceCompletionPattern: "\\(\\w+",
          dup: "force",
        },
        vsnip: {
          mark: "snippet",
        },
        rg: {
          mark: "grep",
        },
        "shell-native": {
          mark: "fish",
        },
        skkeleton: {
          mark: "skk",
          matchers: ["skkeleton"],
          sorters: [],
          isVolatile: true,
        },
      },
      sourceParams: {
        file: {
          filenameChars: "[:keyword:].",
        },
        "shell-native": {
          shell: "fish",
        },
        "lsp": {
          // snippetEngine: async (body: string) => {
          //   await args.denops.call("vsnip#anonymous", body);
          // },
          // confirmBehavior: "replace",
          // enableResolveItem: true,
          // enableAdditionalTextEdit: true,
          // enableDisplayDetail: true,
        },
      },
      postFilters: ["sorter_head"],
    });

    // shell script
    for (const filetype of ["bash", "zsh", "fish"]) {
      args.contextBuilder.patchFiletype(filetype, {
        sourceOptions: {
          _: {
            keywordPattern: "[0-9a-zA-Z_./#:-]*",
          },
        },
        sources: ["shell-native", "around", "file"],
      });
    }
    args.contextBuilder.patchFiletype("deol", {
      specialBufferCompletion: true,
      sources: [
        "shell-native",
        //"shell-history",
        "around",
        "file",
      ],
      sourceOptions: {
        _: {
          keywordPattern: "[0-9a-zA-Z_./#:-]*",
        },
      },
    });

    args.contextBuilder.patchFiletype("typescript", {
      sourceOptions: {
        _: {
          keywordPattern: "#?[a-zA-Z_][0-9a-zA-Z_]*",
        },
      },
    });

    for (
      const filetype of [
        "css",
        // "html",
        "typescript",
        "typescriptreact",
        "tsx",
        "vue",
        // "markdown",
        "graphql",
        "yaml",
        "json",
        "toml",
        "go",
        "rust",
        "python",
        "haskell",
        "clojure",
      ]
    ) {
      args.contextBuilder.patchFiletype(filetype, {
        // sources: ["lsp", "around", "file", "vsnip"],
        sources: ["lsp"],
      });
    }
    args.contextBuilder.patchFiletype("markdown", {
      sources: ["lsp", "around", "file", "vsnip"],
    });
    args.contextBuilder.patchFiletype("html", {
      sources: ["lsp", "around", "file", "vsnip"],
    });

    // args.contextBuilder.patchFiletype("lua", {
    //   sources: ["codeium", "lsp", "nvim-lua", "around"],
    // });

    // Enable specialBufferCompletion for cmdwin.
    args.contextBuilder.patchFiletype("vim", {
      specialBufferCompletion: true,
    });
  }
}
