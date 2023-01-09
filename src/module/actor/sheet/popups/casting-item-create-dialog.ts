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
        ["scroll", "PF2E.CastingItemCreateDialog.scroll"],
        ["wand", "PF2E.CastingItemCreateDialog.wand"],
        ["cantripDeck5", "PF2E.CastingItemCreateDialog.cantripDeck5"],
    ])
);

export class CastingItemCreateDialog extends FormApplication<ActorPF2e> {
    onSubmitCallback: CastingItemCreateCallback;
    spell: SpellPF2e;
    formDataCache: FormOutputData;
    isCantrip: boolean;

    constructor(
        object: ActorPF2e,
        options: Partial<FormApplicationOptions>,
        callback: CastingItemCreateCallback,
        spell: SpellPF2e
    ) {
        super(object, options);

        this.spell = spell;
        this.isCantrip = spell.system.traits.value.includes("cantrip");
        this.formDataCache = {
            itemType: this.isCantrip ? "cantripDeck5" : "scroll",
            level: spell.baseLevel,
        };
        this.onSubmitCallback = callback;
    }

    static override get defaultOptions() {
        const options = super.defaultOptions;

        options.classes = [];
        options.title = game.i18n.localize("PF2E.CastingItemCreateDialog.title");
        options.template = "systems/pf2e/templates/popups/casting-item-create-dialog.hbs";
        options.width = "auto";
        options.submitOnChange = true;
        options.closeOnSubmit = false;

        return options;
    }

    override async getData(): Promise<FormApplicationData<ActorPF2e>> {
        const sheetData: FormApplicationData<ActorPF2e> & FormInputData = await super.getData();

        if (!this.spell) {
            throw ErrorPF2e("CastingItemCreateDialog | Could not read spelldata");
        }

        const { cantripDeck5: cantripDeck5, ...nonCantripOptions } = itemTypeOptions;
        const minimumLevel = this.spell.baseLevel;
        const levels = Array.from(Array(11 - minimumLevel).keys()).map((index) => minimumLevel + index);
        sheetData.validLevels = levels;
        sheetData.itemTypeOptions = this.isCantrip ? { cantripDeck5: cantripDeck5 } : nonCantripOptions;
        sheetData.itemType = this.formDataCache.itemType;
        sheetData.level = this.formDataCache.level;
        return sheetData;
    }

    override async _updateObject(event: Event, formData: FormOutputData) {
        Object.assign(this.formDataCache, formData);
        if (event.type === "submit") {
            await this.formSubmit(event, formData);
        } else {
            await this.formUpdate(event, formData);
        }
    }

    async formUpdate(_event: Event, _formData: FormOutputData) {
        await this.render();
    }

    async formSubmit(_event: Event, _formData: FormOutputData) {
        if (this.formDataCache.itemType === "wand" && this.formDataCache.level === 10) {
            ui.notifications.warn(game.i18n.localize("PF2E.CastingItemCreateDialog.10thLevelWand"));
        } else if (this.onSubmitCallback && this.spell) {
            this.onSubmitCallback(this.formDataCache.level, this.formDataCache.itemType, this.spell);
        }
        this.close();
    }
}

type CastingItemCreateCallback = (
    level: OneToTen,
    itemType: SpellConsumableItemType,
    spell: SpellPF2e
) => Promise<void>;
