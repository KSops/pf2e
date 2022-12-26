import { ActorPF2e } from "@actor/index";
import { SpellPF2e } from "@item";
import { SpellConsumableItemType } from "@item/consumable/spell-consumables";
import { OneToTen } from "@module/data";
import { ErrorPF2e } from "@util";

type FormInputData = {
    itemTypeOptions?: Object;
    validLevels?: number[];
    itemType?: SpellConsumableItemType;
    level?: OneToTen;
};

type FormOutputData = {
    itemType: SpellConsumableItemType;
    level: OneToTen;
};

const itemTypeOptions = Object.fromEntries(
    new Map<SpellConsumableItemType, string>([
        ["scroll", "PF2E.ScrollWandPopup.scroll"],
        ["wand", "PF2E.ScrollWandPopup.wand"],
        ["cantrip-deck-5", "PF2E.ScrollWandPopup.cantripDeck5"],
    ])
);

export class ScrollWandPopup extends FormApplication<ActorPF2e> {
    onSubmitCallback: ScrollWandCallback;
    spell: SpellPF2e;
    formDataCache: FormOutputData;
    isCantrip: boolean;

    constructor(
        object: ActorPF2e,
        options: Partial<FormApplicationOptions>,
        callback: ScrollWandCallback,
        spell: SpellPF2e
    ) {
        super(object, options);

        this.spell = spell;
        this.formDataCache = {
            itemType: "scroll",
            level: spell.baseLevel,
        };
        this.isCantrip = spell.system.traits.value.includes("cantrip");
        this.onSubmitCallback = callback;
    }

    static override get defaultOptions() {
        const options = super.defaultOptions;

        options.classes = [];
        options.title = game.i18n.localize("PF2E.ScrollWandPopup.title");
        options.template = "systems/pf2e/templates/popups/scroll-wand-popup.html";
        options.width = "auto";
        options.submitOnChange = true;
        options.closeOnSubmit = false;

        return options;
    }

    override async getData(): Promise<FormApplicationData<ActorPF2e>> {
        const sheetData: FormApplicationData<ActorPF2e> & FormInputData = await super.getData();

        if (!this.spell) {
            throw ErrorPF2e("ScrollWandPopup | Could not read spelldata");
        }

        const { "cantrip-deck-5": _cantripOption, ...nonCantripOptions } = itemTypeOptions;
        const minimumLevel = this.spell.baseLevel;
        const levels = Array.from(Array(11 - minimumLevel).keys()).map((index) => minimumLevel + index);
        sheetData.validLevels = levels;
        sheetData.itemTypeOptions = this.isCantrip ? itemTypeOptions : nonCantripOptions;
        sheetData.itemType = this.formDataCache.itemType;
        sheetData.level = this.formDataCache.level;
        return sheetData;
    }

    override async _updateObject(event: Event, formData: FormOutputData) {
        if (event.type === "submit") {
            await this.formSubmit(event, formData);
        } else {
            await this.formUpdate(event, formData);
        }
    }

    async formUpdate(_event: Event, formData: FormOutputData) {
        this.formDataCache = formData;
        await this.render();
    }

    async formSubmit(_event: Event, formData: FormOutputData) {
        if (formData.itemType === "wand" && formData.level === 10) {
            ui.notifications.warn(game.i18n.localize("PF2E.ScrollWandPopup.10thLevelWand"));
        } else if (this.onSubmitCallback && this.spell) {
            this.onSubmitCallback(formData.level, formData.itemType, this.spell);
        }
        this.close();
    }
}

type ScrollWandCallback = (level: OneToTen, itemType: SpellConsumableItemType, spell: SpellPF2e) => Promise<void>;
